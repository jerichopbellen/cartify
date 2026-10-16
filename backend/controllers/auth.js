const User = require('../models/user')
const crypto = require('crypto')
const sendEmail = require('../utils/sendEmail')
const cloudinary = require('cloudinary')
const sendToken = require('../utils/jwtToken')

// POST /api/v1/register
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body

        // role is NOT taken from the body, so nobody can register as admin
        const user = await User.create({ name, email, password })
        sendToken(user, 201, res)
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'That email is already registered' })
        }
        if (err.name === 'ValidationError') {
            const message = Object.values(err.errors).map(e => e.message).join(', ')
            return res.status(400).json({ success: false, message })
        }
        res.status(500).json({ success: false, message: err.message })
    }
}

// POST /api/v1/login
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please enter email and password' })
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password')
        const matched = user && await user.comparePassword(password)

        // same message for both cases so nobody can tell which emails exist
        if (!matched) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' })
        }

        sendToken(user, 200, res)
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
}

// GET /api/v1/logout
exports.logout = (req, res) => {
    res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true
    })
    res.status(200).json({ success: true, message: 'Logged out' })
}

// GET /api/v1/me
exports.getUserProfile = (req, res) => {
    res.status(200).json({ success: true, user: req.user })
}

// PUT /api/v1/me/update
exports.updateProfile = async (req, res) => {
    try {
        const body = req.body || {}
        const newData = { name: body.name, email: body.email }

        // only touch the avatar when a new image was chosen
        if (body.avatar) {
            const current = await User.findById(req.user.id)
            if (current.avatar?.public_id) {
                await cloudinary.v2.uploader.destroy(current.avatar.public_id)
            }
            const result = await cloudinary.v2.uploader.upload(body.avatar, {
                folder: 'avatars',
                width: 150,
                crop: 'scale'
            })
            newData.avatar = { public_id: result.public_id, url: result.secure_url }
        }

        const user = await User.findByIdAndUpdate(req.user.id, newData, {
            new: true,
            runValidators: true
        })
        res.status(200).json({ success: true, user })
    } catch (err) {
        console.log('updateProfile error:', err.message)
        res.status(400).json({ success: false, message: err.message })
    }
}

// PUT /api/v1/password/update
exports.updatePassword = async (req, res) => {
    try {
        const { oldPassword } = req.body
        // the professor's page sends "password", other clients may send "newPassword"
        const newPassword = req.body.password || req.body.newPassword

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please enter old and new password' })
        }

        const user = await User.findById(req.user.id).select('+password')

        if (!(await user.comparePassword(oldPassword))) {
            return res.status(400).json({ success: false, message: 'Old password is incorrect' })
        }

        user.password = newPassword
        await user.save() // pre-save hook hashes it
        sendToken(user, 200, res)
    } catch (err) {
        res.status(400).json({ success: false, message: err.message })
    }
}

// POST /api/v1/password/forgot
exports.forgotPassword = async (req, res) => {
    // same answer whether or not the email exists, so nobody can check who is registered
    const reply = { success: true, message: 'If that email is registered, a reset link has been sent' }

    const user = await User.findOne({ email: (req.body.email || '').toLowerCase() })
    if (!user) return res.status(200).json(reply)

    const resetToken = user.getResetPasswordToken()
    await user.save({ validateBeforeSave: false })

    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173'
    const resetUrl = `${frontend}/password/reset/${resetToken}`
    const message = `Your password reset link is:\n\n${resetUrl}\n\nIt expires in 30 minutes. If you did not request this, ignore this email.`

    try {
        await sendEmail({ email: user.email, subject: 'Cartify Password Recovery', message })
        res.status(200).json(reply)
    } catch (err) {
        user.resetPasswordToken = undefined
        user.resetPasswordExpire = undefined
        await user.save({ validateBeforeSave: false })
        res.status(500).json({ success: false, message: 'Email could not be sent. Check your SMTP settings.' })
    }
}

// PUT /api/v1/password/reset/:token
exports.resetPassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body
        const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex')

        const user = await User.findOne({
            resetPasswordToken: hashed,
            resetPasswordExpire: { $gt: Date.now() }
        })

        if (!user) {
            return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired' })
        }
        if (!password || password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' })
        }

        user.password = password
        user.resetPasswordToken = undefined
        user.resetPasswordExpire = undefined
        await user.save()
        sendToken(user, 200, res)
    } catch (err) {
        res.status(400).json({ success: false, message: err.message })
    }
}

// ---------------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------------

// GET /api/v1/admin/users
exports.allUsers = async (req, res) => {
    try {
        const users = await User.find()
        res.status(200).json({ success: true, users })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
}

// GET /api/v1/admin/user/:id
exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        if (!user) {
            return res.status(404).json({ success: false, message: `User not found with id: ${req.params.id}` })
        }
        res.status(200).json({ success: true, user })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
}

// PUT /api/v1/admin/user/:id
exports.updateUser = async (req, res) => {
    try {
        const newUserData = {
            name: req.body.name,
            email: req.body.email,
            role: req.body.role
        }

        const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
            new: true,
            runValidators: true
        })
        if (!user) {
            return res.status(404).json({ success: false, message: `User not found with id: ${req.params.id}` })
        }
        res.status(200).json({ success: true })
    } catch (err) {
        res.status(400).json({ success: false, message: err.message })
    }
}

// DELETE /api/v1/admin/user/:id
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        if (!user) {
            return res.status(404).json({ success: false, message: `User not found with id: ${req.params.id}` })
        }

        // remove the avatar from cloudinary too, if there is one
        if (user.avatar?.public_id) {
            await cloudinary.v2.uploader.destroy(user.avatar.public_id)
        }

        await User.findByIdAndDelete(req.params.id)
        res.status(200).json({ success: true })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
}
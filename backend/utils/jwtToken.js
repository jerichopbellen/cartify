const sendToken = (user, statusCode, res) => {
    // Create Jwt token
    const token = user.getJwtToken()
    user.password = undefined // never send the hash

    // Options for cookie
    const options = {
        expires: new Date(
            Date.now() + process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000
        ),
        // domain: ".localhost",
        httpOnly: true,
        secure: true,
        sameSite: 'none',
    }

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        user
    })
}

module.exports = sendToken
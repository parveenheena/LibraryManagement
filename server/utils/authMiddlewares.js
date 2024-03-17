const jwt = require("jsonwebtoken");

// Authentication middleware
const auth = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; 

    if (token) {
        try {
            const decoded = jwt.verify(token, "heena");

            if (decoded) {
                req.body.userID = decoded.userID;
                req.body.name = decoded.user;
                next();
            } else {
                res.status(401).json({ msg: "You're not authorized" });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        }
    } else {
        res.status(401).json({ msg: "You're not logged in" });
    }
};

module.exports = {
    auth
};

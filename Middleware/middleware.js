import express from "express";
export const validateUser = (req, res, next) => {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
        return res.status(400).json({ Error: "Name, Username, and Password are required to be filled" });
    };
    if (password.length < 6) {
        return res.status(400).json({ Error: "Password must be of at least 6 characters of length " });
    };
    next();
};
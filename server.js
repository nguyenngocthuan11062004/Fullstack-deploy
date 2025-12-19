require('dotenv').config();  // Đọc biến môi trường từ .env

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Cấu hình CORS: chỉ cho phép frontend của bạn gửi yêu cầu
const allowedOrigins = [
    "https://thuanfrontend.web.app",  // Thêm URL frontend Firebase
];

// Cấu hình CORS với các options
const options = {
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
};

app.use(cors(options));  // Áp dụng CORS với cấu hình

app.use(express.json());

// Kết nối MongoDB sử dụng MONGO_URI từ biến môi trường
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB Error:", err));

// SCHEMA
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Tên không được để trống"],
        minlength: [2, "Tên phải có ít nhất 2 ký tự"]
    },
    age: {
        type: Number,
        required: [true, "Tuổi không được để trống"],
        min: [0, "Tuổi phải >= 0"],
        validate: {
            validator: Number.isInteger,
            message: "Tuổi phải là số nguyên"
        }
    },
    email: {
        type: String,
        required: [true, "Email không được để trống"],
        unique: true, // <===== EMAIL DUY NHẤT
        match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"]
    },
    address: {
        type: String
    }
});

const User = mongoose.model("User", UserSchema);

// API routes (GET, POST, PUT, DELETE)
app.get("/api/users", async (req, res) => {
    try {
        let page = parseInt(req.query.page, 10) || 1;
        let limit = parseInt(req.query.limit, 10) || 5;
        const search = (req.query.search || "").trim();

        const filter = search
            ? {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { address: { $regex: search, $options: "i" } },
                ],
            }
            : {};

        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            User.find(filter).skip(skip).limit(limit).sort({ _id: -1 }),
            User.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit);

        res.json({
            page,
            limit,
            total,
            totalPages,
            data: users,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }

        res.json({ message: "Xóa người dùng thành công" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Start Server
app.listen(process.env.PORT || 3001, () => {
    console.log(`Server running on http://localhost:${process.env.PORT || 3001}`);
});

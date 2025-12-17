const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

mongoose
    .connect(
        "mongodb+srv://20225413:20225413@cluster0.wdl9ui5.mongodb.net/IT4409?retryWrites=true&w=majority"
    )
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB Error:", err));

//SCHEMA
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


//          GET
app.get("/api/users", async (req, res) => {
    try {
        let page = parseInt(req.query.page, 10) || 1;
        let limit = parseInt(req.query.limit, 10) || 5;

        // Không cho FE truyền linh tinh:
        if (page < 1) page = 1;
        if (limit < 1 || limit > 50) limit = 5;

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


// POST
app.post("/api/users", async (req, res) => {
    try {
        const { name, age, email, address } = req.body;

        const newUser = await User.create({ name, age, email, address });

        res.status(201).json({
            message: "Tạo người dùng thành công",
            data: newUser
        });
    } catch (err) {
        // Email trùng sẽ vào đây
        res.status(400).json({ error: err.message });
    }
});

//          PUT
app.put("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const updateData = {};
        ["name", "age", "email", "address"].forEach((key) => {
            if (req.body[key] !== undefined && req.body[key] !== null) {
                updateData[key] = req.body[key];
            }
        });

        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }

        res.json({
            message: "Cập nhật người dùng thành công",
            data: updatedUser
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

//         DELETE
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

//       START SERVER
app.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
});

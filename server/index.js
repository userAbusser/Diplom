const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken")
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { type } = require("os");

app.use(express.json());//
app.use(cors());//конектіт апку через 4000 порт

//З'єднання з бд MongoDB
mongoose.connect("mongodb+srv://pankovama:9sZoF9HCYU00uVjq@cluster0.qdh5t5b.mongodb.net/PhoneStore")

//API creation
app.get("/", (req, res) => {
    res.send("Express App is Running")
})

//Зберігання картинок
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})


const upload = multer({ storage: storage })

//створення ендпоінта для картинок
app.use('/images', express.static('upload/images'))


app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})

//Схема для створення товарів
const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,

    },
    name: {
        type: String,
        required: true,
    },

    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },

    new_price: {
        type: Number,
        requires: true,
    },

    old_price: {
        type: Number,
        required: true,
    },

    date: {
        type: Date,
        default: Date.now,
    },

    available: {
        type: Boolean,
        default: true,
    },

}
)

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    }

    else {
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,

    });

    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success: true,
        name: req.body.name,
    })
})

//ВИДАЛЕННЯ ОБ₴ЄКУ З БД
app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log("Видалено");
    res.json({
        success: true,
        name: req.body.name
    })
})

//ОТРИМАННЯ ВСІХ ТОВАРІВ
app.get('/allproducts', async (req, res) => {
    let products = await Product.find({});
    console.log("ВСІ ТОВАРИ Є");
    res.send(products);

})

//Створення об'єктів для користувачів
const Users = mongoose.model('Users', {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },

    cartData: {
        type: Object,
    },

    date: {
        type: Date,
        default: Date.now,
    }
})

//Створення апі для реєстрації користувача

app.post('/signup', async (req, res) => {

    let check = await Users.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({ success: false, error: "Користувач з такою електронною адресою вже зареєстрований" })
    }
    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
    }

    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
    })

    await user.save();

    const data = {
        user: {
            id: user.id
        }
    }

    const token = jwt.sign(data, 'SECRET_KEY');
    res.json({ success: true, token })
})

//створення для логіна
app.post('/login', async (req, res) => {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id
                }
            }
            const token = jwt.sign(data, 'SECRET_KEY');
            res.json({ success: true, token });
        }
        else {
            res.json({ success: false, errors: "Невірний пароль" });
        }
    }

    else {
        res.json({ success: false, errors: "Невірний ємейл  " })
    }

})

//creating end point for new
app.get('/newarrivals', async (req, res) => {
    let products = await Product.find({});
    let newarrivals = products.slice(1).slice(-8);
    console.log("New Arrivals Fetched");
    res.send(newarrivals);
})


//creating endpoint for popular
app.get('/popular', async (req, res) => {
    let products = await Product.find({});
    let popular = products.slice(0, 4);
    console.log("Popular fetched");
    res.send(popular)
})

//creating middleware to fetch user
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ errors: "Будь-ласка зареєструйтесь" })
    }
    else {
        try {
            const data = jwt.verify(token, 'SECRET_KEY');
            req.user = data.user;
            next();
        }
        catch (error) {
            res.status(401).send({ errors: "please authenticate use valid token" })
        }
    }
}

//creating endpoint for adding products in cartdata
app.post('/addtocart', fetchUser, async (req, res) => {
    console.log("Addid", req.body.itemId);
    let userData = await Users.findOne({ _id: req.user.id });
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Додано")
})

//createing endpoint to remove from cartdata
app.post('/removefromcart', fetchUser, async (req, res) => {
    console.log("removed", req.body.itemId);
    let userData = await Users.findOne({ _id: req.user.id });
    if (userData.cartData[req.body.itemId] > 0)
        userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Removed")
})

//creating endpoint to get cartdata
app.post('/getcart', fetchUser, async (req, res) => {
    console.log("GetCart");
    let userData = await Users.findOne({ _id: req.user.id });
    res.json(userData.cartData);

})

app.listen(port, (error) => {
    if (!error) {
        console.log("Server running on Port" + port)
    }

    else {
        console.log("Error" + error)
    }
})




const { UserModel } = require('../models/User');
const { BookModel } = require('../models/Book');
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken");
const { RedisClient } = require("../controllers/redis.middleware");
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'parveenheena196@gmail.com',
    pass: 'parveenheena',
  },
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const resolvers = {
  Query: {
    getBooks: async () => await BookModel.find(),
    getUsers: async () => await UserModel.find()
  },
  Mutation: {
    signUpUser: async (_, { userNew }) => {
      const hashPass = await bcrypt.hash(userNew.password, 5);
      const user = new UserModel({ ...userNew, password: hashPass });
      const newUser = await user.save();
      return newUser;

    },
    // REQUEST OTP
    requestOTP: async (_, { email }) => {
      const otp = generateOTP();
      RedisClient.setex("otp", 3600, otp);

      // Send OTP via email
      try {
        await transporter.sendMail({
          from: 'parveenheena196@gmail.com',
          to: email,
          subject: 'OTP for Authentication',
          text: `Your OTP is: ${otp}`,
        });
        return 'OTP sent successfully';
      } catch (error) {
        console.error("Error sending OTP:", error.message);
        throw new Error('Failed to send OTP');
      }
    },

    login: async (_, { userSignIn }) => {
      const user = await UserModel.findOne({ email: userSignIn.email });
      if (!user) {
        throw new Error("User Not Found!");
      }
      const isPassCorrect = await bcrypt.compare(userSignIn.password, user.password);
      if (!isPassCorrect) {
        throw new Error("Invalid Crediantials, Try again !")
      }
      const token = jwt.sign({ userId: user.id }, "heena")
      RedisClient.setex("key", 3600, token);
      RedisClient.get("key", (err, result) => {
        if (err) {
          console.error(err);
        } else {
          console.log(result);
        }
      });
      return { token };
    },
    async addBook(_, { bookInput }, { user }) {
      if (!user) {
        throw new Error("Authentication failed! User not Logged in ");
      }
      if (user.role != "admin") {
        throw new Error("Admin Authentication failed!");
      }

      const { title, author, description, rentPrice, buyPrice } = bookInput;
      const newBook = new BookModel({
        title,
        author,
        description,
        rentPrice,
        buyPrice
      });
      const savedBook = await newBook.save();
      return savedBook;
    },
    deleteBook: async (_, { id }, { user }) => {
      if (!user) {
        throw new Error("Authentication failed! User not Logged in ");
      }

      if (user.role !== "admin") {
        throw new Error("Admin Authentication failed!");
      }

      const deletedBook = await BookModel.findByIdAndDelete(id);
      if (!deletedBook) {
        throw new Error("Book not found");
      }

      return deletedBook;
    },
    updateBook: async (_, { id, bookInput }, { user }) => {
      if (!user) {
        throw new Error("Authentication failed! User not Logged in");
      }

      if (user.role !== "admin") {
        throw new Error("Admin Authentication failed!");
      }

      try {
        const updatedBook = await BookModel.findByIdAndUpdate(
          id,
          { $set: bookInput },
          { new: true }
        );

        if (!updatedBook) {
          throw new Error("Book not found");
        }

        return updatedBook;
      } catch (error) {
        console.error("Error updating book:", error.message);
        throw new Error("Failed to update book");
      }
    },
    logout: async (_, __, { user }) => {
      if (!user) {
        throw new Error(" User Already Logged Out");
      }
      RedisClient.del(token);
      return `User ${user.name} has been logged out`;
    },

    //  Rent or Buy Books
    rentBook: async (_, { id }, { user }) => {
      if (!user) {
        throw new Error("User not logged in");
      }

      try {
        const book = await BookModel.findById(id);
        if (!book) {
          throw new Error("Book not found");
        }
        user.booksOwned.push(book);
        await user.save();

        return book;
      } catch (error) {
        console.error("Error renting book:", error.message);
        throw new Error("Failed to rent book");
      }
    },
    buyBook: async (_, { id }, { user }) => {
      if (!user) {
        throw new Error("Authentication failed! User not Logged in");
      }

      try {
        const book = await BookModel.findById(id);
        if (!book) {
          throw new Error("Book not found");
        }
        user.booksOwned.push(book);
        await user.save();

        return book;
      } catch (error) {
        console.error("Error buying book:", error.message);
        throw new Error("Failed to buy book");
      }
    },

  }
};



module.exports = resolvers
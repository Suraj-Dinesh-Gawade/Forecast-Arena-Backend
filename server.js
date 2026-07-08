import express from "express";
import dotenv from "dotenv";
import routes from "./Routes/routes.js";
import cors from "cors";

const app = express();

dotenv.config();

app.use(cors());
app.use(express.json());

app.use("/", routes);

const port = process.env.PORT;

app.listen(port, () => {
    console.log("Server started at port 8000");
});

import express from "express";
import axios from "axios";

const app = express();

const CLOUD_NAME = process.env.CLOUD_NAME;
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

app.get("/videos", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video`,
      {
        auth: {
          username: API_KEY,
          password: API_SECRET,
        },
        params: {
          max_results: 10, // pagination possible
        },
      }
    );
    res.json(response.data.resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET une vidéo par public_id
app.get("/:id", async (req, res) => {
  const { data } = await axios.get(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video/upload/${req.params.id}`,
    { auth: { username: API_KEY, password: API_SECRET } }
  );
  res.json(data);
});

app.listen(3000, () => console.log("Server lancé sur http://localhost:3000"));

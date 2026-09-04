import "dotenv/config";
import express, { Express } from "express";
import multer from "multer";
import swaggerUi from "swagger-ui-express";
import foodRoutes from "./src/api/food.controller";
import { swaggerSpec } from "./src/swagger";

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Multer setup for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// API docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/api/food", upload.single("image"), foodRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

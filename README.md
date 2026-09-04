# Food Nutrition Analyzer POC

A simple backend API that accepts food images and uses OpenAI's Vision API to analyze their nutritional value.

## Features

- 📸 Image upload and analysis using OpenAI Vision API
- 📊 Structured nutritional data extraction (calories, protein, carbs, fat, fiber)
- 💾 In-memory record storage with summaries
- ✅ Input validation with Zod
- 🏗️ Clean architecture with separated concerns
- 📝 TypeScript for type safety

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **AI**: OpenAI Vision API (gpt-4-vision)
- **Validation**: Zod
- **Image Handling**: Multer

## Setup

### Prerequisites

- Node.js 18+
- OpenAI API key (get from [platform.openai.com](https://platform.openai.com))

### Installation

1. **Clone/setup the project**
   ```bash
   npm install
   ```

2. **Create .env file**
   ```bash
   cp .env.example .env
   ```
   Add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-...
   PORT=3000
   ```

3. **Run in development**
   ```bash
   npm run dev
   ```

   **Or build and run**
   ```bash
   npm run build
   npm start
   ```

Server will start on `http://localhost:3000`

## API Endpoints

### Analyze Food Image
```bash
POST /api/food/analyze
Content-Type: multipart/form-data

Body:
- image: <image file>

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "foodName": "Chicken Rice",
    "estimatedServingSize": "200g",
    "calories": 450,
    "protein": 28,
    "carbohydrates": 52,
    "fat": 12,
    "fiber": 2,
    "confidence": "high",
    "notes": "Estimated portion size based on typical bowl",
    "analyzedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get All Records
```bash
GET /api/food/records

Response:
{
  "success": true,
  "data": [...],
  "count": 5
}
```

### Get Nutrition Summary
```bash
GET /api/food/summary

Response:
{
  "success": true,
  "data": {
    "totalCalories": 2250,
    "totalProtein": 140,
    "totalCarbs": 260,
    "totalFat": 60,
    "totalFiber": 10,
    "itemCount": 5,
    "avgConfidence": "high"
  }
}
```

### Get Single Record
```bash
GET /api/food/records/:id
```

### Delete Record
```bash
DELETE /api/food/records/:id
```

## Testing with cURL

```bash
# Analyze an image
curl -X POST http://localhost:3000/api/food/analyze \
  -F "image=@/path/to/food.jpg"

# Get all records
curl http://localhost:3000/api/food/records

# Get summary
curl http://localhost:3000/api/food/summary

# Get specific record
curl http://localhost:3000/api/food/records/{id}

# Delete record
curl -X DELETE http://localhost:3000/api/food/records/{id}
```

## Project Structure

```
src/
├── api/
│   └── food.controller.ts       # API routes & handlers
├── services/
│   ├── food-analyzer.ts         # OpenAI integration & parsing
│   └── nutrition-service.ts     # Record management & storage
├── ai/
│   ├── openai-client.ts        # OpenAI API wrapper
│   ├── prompts.ts              # AI prompts
│   └── schemas.ts              # Zod validation schemas
└── models/
    └── nutrition.ts            # TypeScript interfaces

app.ts                          # Express app setup
```

## How It Works

1. **Image Upload**: Express receives image via multipart form data
2. **OpenAI Analysis**: Image sent to gpt-4-vision with structured prompt
3. **JSON Parsing**: Response parsed and validated with Zod schema
4. **Storage**: Nutrition data stored in-memory with UUID
5. **Response**: Structured nutrition data returned to client

## Confidence Levels

- **High**: Clear food identification, standard portion size
- **Medium**: Some uncertainty in portion or food type
- **Low**: Unclear image or complex mixed dish

## Notes for Future Enhancements

- [ ] Database persistence (PostgreSQL/MongoDB)
- [ ] User authentication & authorization
- [ ] Batch image processing
- [ ] Recipe/meal suggestions
- [ ] Dietary preference filtering
- [ ] Historical analytics
- [ ] Cache OpenAI results for common foods
- [ ] Rate limiting
- [ ] Image preprocessing/validation

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (no image)
- `404`: Record not found
- `500`: Server error (OpenAI API failure, parsing error)

## Development Notes

- In-memory storage is suitable for POC; swap `nutritionService` for database implementation for production
- OpenAI Vision API requires image to be base64 encoded; Multer handles this transparently
- Prompt engineering is key to accurate nutrition extraction; adjust `NUTRITION_ANALYSIS_PROMPT` for better results

## License

MIT

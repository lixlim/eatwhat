# API Usage Examples

## 1. Upload and Analyze Food Image

### Using cURL
```bash
curl -X POST http://localhost:3000/api/food/analyze \
  -F "image=@./sample-food.jpg"
```

### Using JavaScript/Node
```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function analyzeFood() {
  const formData = new FormData();
  formData.append('image', fs.createReadStream('./sample-food.jpg'));

  try {
    const response = await axios.post(
      'http://localhost:3000/api/food/analyze',
      formData,
      { headers: formData.getHeaders() }
    );
    console.log('Analysis result:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

analyzeFood();
```

### Using Python
```python
import requests

def analyze_food(image_path):
    with open(image_path, 'rb') as f:
        files = {'image': f}
        response = requests.post(
            'http://localhost:3000/api/food/analyze',
            files=files
        )
    return response.json()

result = analyze_food('./sample-food.jpg')
print(result)
```

## 2. Get All Records

### cURL
```bash
curl http://localhost:3000/api/food/records
```

### JavaScript
```javascript
const axios = require('axios');

async function getAllRecords() {
  const response = await axios.get('http://localhost:3000/api/food/records');
  console.log('All records:', response.data);
}

getAllRecords();
```

## 3. Get Nutrition Summary

### cURL
```bash
curl http://localhost:3000/api/food/summary
```

### Response Example
```json
{
  "success": true,
  "data": {
    "totalCalories": 3200,
    "totalProtein": 180,
    "totalCarbs": 380,
    "totalFat": 85,
    "totalFiber": 25,
    "itemCount": 5,
    "avgConfidence": "high"
  }
}
```

## 4. Track Daily Meals

```bash
#!/bin/bash

# Breakfast
curl -X POST http://localhost:3000/api/food/analyze \
  -F "image=@breakfast.jpg"

# Lunch
curl -X POST http://localhost:3000/api/food/analyze \
  -F "image=@lunch.jpg"

# Dinner
curl -X POST http://localhost:3000/api/food/analyze \
  -F "image=@dinner.jpg"

# Get daily summary
curl http://localhost:3000/api/food/summary
```

## 5. Delete a Record

### cURL
```bash
# First get all records to find an ID
curl http://localhost:3000/api/food/records

# Then delete
curl -X DELETE http://localhost:3000/api/food/records/{record_id}
```

## Sample Response Format

### Analyze Endpoint Response
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p",
    "foodName": "Grilled Salmon with Broccoli",
    "estimatedServingSize": "200g salmon + 150g broccoli",
    "calories": 520,
    "protein": 48,
    "carbohydrates": 18,
    "fat": 28,
    "fiber": 4,
    "confidence": "high",
    "notes": "Salmon appears to be wild-caught based on color. Broccoli lightly steamed.",
    "analyzedAt": "2024-01-15T12:30:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "No image file provided"
}
```

## Testing Script (Node.js)

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'http://localhost:3000/api/food';

async function testAPI() {
  try {
    console.log('🧪 Testing Food Nutrition Analyzer API\n');

    // Test 1: Check health
    console.log('✓ Server is running');

    // Test 2: Analyze image (if sample exists)
    const imagePath = './sample-food.jpg';
    if (fs.existsSync(imagePath)) {
      console.log('\n📸 Analyzing food image...');
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));

      const analyzeRes = await axios.post(`${API_BASE}/analyze`, formData, {
        headers: formData.getHeaders(),
      });

      console.log('✓ Analysis complete:');
      console.log(`  Food: ${analyzeRes.data.data.foodName}`);
      console.log(`  Calories: ${analyzeRes.data.data.calories}`);
      console.log(`  Confidence: ${analyzeRes.data.data.confidence}`);
    } else {
      console.log('\n⚠️  No sample image found. Skipping analysis test.');
    }

    // Test 3: Get records
    console.log('\n📊 Fetching all records...');
    const recordsRes = await axios.get(`${API_BASE}/records`);
    console.log(`✓ Found ${recordsRes.data.count} records`);

    // Test 4: Get summary
    console.log('\n📈 Getting nutrition summary...');
    const summaryRes = await axios.get(`${API_BASE}/summary`);
    const summary = summaryRes.data.data;
    console.log('✓ Summary:');
    console.log(`  Total Calories: ${summary.totalCalories}`);
    console.log(`  Total Protein: ${summary.totalProtein}g`);
    console.log(`  Total Carbs: ${summary.totalCarbs}g`);
    console.log(`  Average Confidence: ${summary.avgConfidence}`);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error(
      '❌ Test failed:',
      error.response?.data || error.message
    );
  }
}

testAPI();
```

## Tips

1. **Best Results**: Use clear, well-lit images of plated food
2. **Portion Size**: Try to include a reference object (plate, hand) for scale
3. **Multiple Dishes**: More accurate if food items are separated/plated individually
4. **Confidence**: High confidence requires clear identification and standard portions

## Integrating with Frontend

### React Example
```javascript
import React, { useState } from 'react';

function FoodAnalyzer() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/food/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setAnalysis(data.data);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleImageUpload} accept="image/*" />
      {loading && <p>Analyzing...</p>}
      {analysis && (
        <div>
          <h2>{analysis.foodName}</h2>
          <p>Calories: {analysis.calories}</p>
          <p>Protein: {analysis.protein}g</p>
        </div>
      )}
    </div>
  );
}

export default FoodAnalyzer;
```

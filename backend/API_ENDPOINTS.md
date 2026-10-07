# SecureLearn Backend API Documentation

## Base URL
All API endpoints are prefixed with: `/api/v1`

**Example**: `http://localhost:8080/api/v1/course`

---

## CORS Configuration

The backend is configured to allow cross-origin requests from the following origins:
- `http://localhost:3000` (React default)
- `http://localhost:5173` (Vite default)
- `http://localhost:5174` (Vite alternative)

### Allowed Methods
- GET
- POST
- PUT
- DELETE
- PATCH
- OPTIONS

### Allowed Headers
- All headers (`*`)

### Credentials
- Cookies and authorization headers are allowed (`credentials: true`)

---

## API Endpoints

### Course Management

#### 1. Create Course
- **Endpoint**: `POST /api/v1/course`
- **Description**: Create a new course
- **Request Body**:
```json
{
  "id": "COURSE-001",
  "title": "Introduction to Spring Boot",
  "description": "Learn the basics of Spring Boot",
  "instructor": "John Doe",
  "prices": 99.99
}
```
- **Response**: 
```json
{
  "success": "Courses added successfully"
}
```

#### 2. Get All Courses
- **Endpoint**: `GET /api/v1/allcourses`
- **Description**: Retrieve all courses
- **Response**: Array of course objects

#### 3. Get Courses by ID
- **Endpoint**: `GET /api/v1/course`
- **Description**: Get courses by partition key
- **Request Body**:
```json
{
  "partitionKey": "COURSE-001"
}
```
- **Response**: Array of matching courses

#### 4. Update Course
- **Endpoint**: `POST /api/v1/updateCourse`
- **Description**: Update an existing course
- **Request Body**:
```json
{
  "id": "COURSE-001",
  "title": "Updated Course Title",
  "description": "Updated description",
  "instructor": "Jane Smith",
  "prices": 149.99
}
```
- **Response**:
```json
{
  "success": "Courses updated successfully"
}
```

#### 5. Delete Course
- **Endpoint**: `DELETE /api/v1/course`
- **Description**: Delete a course and all its lessons
- **Request Body**:
```json
{
  "partitionKey": "COURSE-001"
}
```
- **Response**: `204 No Content`

---

### Lesson Management

#### 1. Add Lesson
- **Endpoint**: `POST /api/v1/lesson`
- **Description**: Add a new lesson to a course
- **Request Body**:
```json
{
  "id": "COURSE-001",
  "chapter": "Chapter-01",
  "title": "Getting Started",
  "description": "Introduction to the course",
  "videoURL": "https://example.com/video.m3u8"
}
```
- **Response**:
```json
{
  "success": "Lesson added successfully"
}
```

#### 2. Get Lesson
- **Endpoint**: `GET /api/v1/lesson`
- **Description**: Get a specific lesson
- **Request Body**:
```json
{
  "partitionKey": "COURSE-001",
  "sortKey": "Chapter-01"
}
```
- **Response**: Lesson object

#### 3. Update Lesson
- **Endpoint**: `POST /api/v1/updatelesson`
- **Description**: Update an existing lesson
- **Request Body**:
```json
{
  "id": "COURSE-001",
  "chapter": "Chapter-01",
  "title": "Updated Lesson Title",
  "description": "Updated description",
  "videoURL": "https://example.com/updated-video.m3u8"
}
```
- **Response**:
```json
{
  "success": "Lesson update successfully"
}
```

#### 4. Delete Lesson
- **Endpoint**: `DELETE /api/v1/lesson`
- **Description**: Delete a specific lesson
- **Request Body**:
```json
{
  "partitionKey": "COURSE-001",
  "sortKey": "Chapter-01"
}
```
- **Response**: `204 No Content`

---

## Frontend Integration Example

### Using Fetch API

```javascript
// Base URL configuration
const API_BASE_URL = 'http://localhost:8080/api/v1';

// Get all courses
async function getAllCourses() {
  const response = await fetch(`${API_BASE_URL}/allcourses`, {
    method: 'GET',
    credentials: 'include', // Include cookies if needed
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return await response.json();
}

// Create a new course
async function createCourse(courseData) {
  const response = await fetch(`${API_BASE_URL}/course`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(courseData),
  });
  return await response.json();
}

// Delete a course
async function deleteCourse(courseId) {
  const response = await fetch(`${API_BASE_URL}/course`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ partitionKey: courseId }),
  });
  return response.status === 204;
}
```

### Using Axios

```javascript
import axios from 'axios';

// Configure axios instance
const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get all courses
export const getAllCourses = () => api.get('/allcourses');

// Create course
export const createCourse = (data) => api.post('/course', data);

// Update course
export const updateCourse = (data) => api.post('/updateCourse', data);

// Delete course
export const deleteCourse = (courseId) => 
  api.delete('/course', { data: { partitionKey: courseId } });

// Add lesson
export const addLesson = (data) => api.post('/lesson', data);

// Get lesson
export const getLesson = (courseId, chapterId) => 
  api.get('/lesson', { data: { partitionKey: courseId, sortKey: chapterId } });

// Update lesson
export const updateLesson = (data) => api.post('/updatelesson', data);

// Delete lesson
export const deleteLesson = (courseId, chapterId) => 
  api.delete('/lesson', { data: { partitionKey: courseId, sortKey: chapterId } });
```

---

## Configuration

### Environment Variables

To customize CORS origins for production, set:
```properties
cors.allowed.origins=https://yourdomain.com,https://www.yourdomain.com
```

Or via environment variable:
```bash
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Default CORS Origins
If not configured, the following origins are allowed by default:
- `http://localhost:3000`
- `http://localhost:5173`

---

## Migration Guide

### Old Endpoints → New Endpoints

| Old Endpoint | New Endpoint |
|--------------|--------------|
| `/course` | `/api/v1/course` |
| `/lesson` | `/api/v1/lesson` |
| `/allcourses` | `/api/v1/allcourses` |
| `/updateCourse` | `/api/v1/updateCourse` |
| `/updatelesson` | `/api/v1/updatelesson` |

### Frontend Changes Required

1. Update all API calls to use `/api/v1` prefix
2. Ensure `credentials: 'include'` or `withCredentials: true` is set for authenticated requests
3. Handle CORS preflight (OPTIONS) requests properly

---

## Notes

- ⚠️ **Important**: GET requests with request body (like `/course` and `/lesson`) are not RESTful best practices. Consider migrating to path parameters or query strings.
- All timestamps are in ISO 8601 format
- The backend uses DynamoDB with partition key (id) and sort key (chapter) structure
- Authentication is handled via AWS Cognito OAuth2

---

**Last Updated**: 2026-10-07  
**API Version**: v1  
**Spring Boot Version**: 4.1.1

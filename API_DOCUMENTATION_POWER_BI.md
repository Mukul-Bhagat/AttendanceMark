# API Documentation for Power BI Integration

## Authentication

### ⚠️ **CRITICAL: JWT Token Expiration**

**JWT tokens expire after 7 days.** This is important for Power BI because:

1. **Token Expiration**: Tokens are valid for 7 days from the time of login
2. **No Auto-Refresh**: There is no token refresh endpoint - you must re-authenticate when the token expires
3. **Power BI Impact**: If your Power BI dataset refresh runs after the token expires, it will fail with a 401 Unauthorized error

### How to Obtain a JWT Token

**Step 1: Initial Login**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "tempToken": "temporary-token-valid-for-5-minutes",
  "organizations": [
    {
      "orgName": "Your Organization",
      "prefix": "org_your_organization",
      "role": "SuperAdmin",
      "userId": "507f191e810c19729de860ea"
    }
  ]
}
```

**Step 2: Select Organization**
```
POST /api/auth/select-organization
Content-Type: application/json

{
  "tempToken": "temporary-token-from-step-1",
  "prefix": "org_your_organization"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f191e810c19729de860ea",
    "email": "your-email@example.com",
    "role": "SuperAdmin"
  }
}
```

**Use the `token` value in the Authorization header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Solutions for Power BI

**Option 1: Long-Lived Service Account (Recommended)**
- Create a dedicated service account (SuperAdmin or Manager role) for Power BI
- Use this account's credentials to generate tokens
- Set up a reminder to refresh the token every 6 days (before expiration)
- Store the token securely in Power BI's credential manager

**Option 2: Power Query with Custom Authentication Function**
- Create a Power Query function that:
  1. Checks if the current token is expired (or close to expiring)
  2. If expired, calls the login endpoints to get a new token
  3. Stores the new token for future use
- This requires storing credentials in Power BI and implementing the login flow in M code

**Option 3: Manual Token Refresh**
- Manually refresh the token every 6 days
- Update the token in Power BI data source credentials
- Simple but requires manual intervention

**Option 4: API Key Alternative (Future Enhancement)**
- Consider requesting an API key endpoint from the development team
- API keys typically don't expire or have much longer expiration times
- Better suited for automated integrations like Power BI

### Token Expiration Detection

You can check if a token is expired by:
1. Decoding the JWT token (it's a base64-encoded JSON)
2. Checking the `exp` field (expiration timestamp)
3. Comparing with current time

Example (JavaScript/Power Query):
```javascript
// Decode JWT (without verification - just to check expiration)
const tokenParts = token.split('.');
const payload = JSON.parse(atob(tokenParts[1]));
const expirationTime = payload.exp * 1000; // Convert to milliseconds
const isExpired = Date.now() >= expirationTime;
```

---

## 1. SESSIONS (History)

### Endpoint
```
GET /api/sessions
```

### Description
Returns all sessions for the authenticated user's organization. 
- **EndUsers**: Only see sessions they are assigned to
- **Admins/Managers**: See all sessions in the organization

### Response Format
Returns an array of session objects, sorted by creation date (newest first).

### Sample JSON Response
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Mathematics Class",
    "description": "Advanced Calculus",
    "frequency": "Weekly",
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-06-30T00:00:00.000Z",
    "startTime": "09:00",
    "endTime": "10:30",
    "locationType": "Physical",
    "sessionType": "PHYSICAL",
    "physicalLocation": "Room 101",
    "virtualLocation": null,
    "location": {
      "type": "COORDS",
      "geolocation": {
        "latitude": 28.6139,
        "longitude": 77.2090
      }
    },
    "geolocation": {
      "latitude": 28.6139,
      "longitude": 77.2090
    },
    "radius": 100,
    "assignedUsers": [
      {
        "userId": "507f191e810c19729de860ea",
        "email": "student1@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "mode": "PHYSICAL",
        "isLate": false,
        "attendanceStatus": "Present"
      }
    ],
    "weeklyDays": ["Monday", "Wednesday", "Friday"],
    "sessionAdmin": "507f191e810c19729de860eb",
    "createdBy": "507f191e810c19729de860ec",
    "organizationPrefix": "ORG001",
    "classBatchId": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Batch A",
      "description": "Morning Batch"
    },
    "isCancelled": false,
    "cancellationReason": null,
    "isCompleted": false,
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-10T10:00:00.000Z"
  }
]
```

### Key Fields for Power BI
- `_id`: Session unique identifier
- `name`: Session name
- `frequency`: OneTime, Daily, Weekly, or Monthly
- `startDate`, `endDate`: Session date range
- `startTime`, `endTime`: Time in HH:mm format
- `sessionType`: PHYSICAL, REMOTE, or HYBRID
- `assignedUsers`: Array of users assigned to this session
- `classBatchId`: **Partial class/batch data** - Only includes `_id`, `name`, and `description`. For full class/batch data, use `GET /api/classes` endpoint (see section 4 below)
- `isCancelled`: Boolean indicating if session was cancelled
- `createdAt`, `updatedAt`: Timestamps

### ⚠️ Note on Class/Batch Data
The `classBatchId` field in sessions only contains **partial data** (`_id`, `name`, `description`). To get complete class/batch information including `createdBy`, `defaultTime`, `defaultLocation`, `organizationPrefix`, `createdAt`, and `updatedAt`, use the dedicated class/batch endpoints (see Section 4).

---

## 4. CLASS BATCHES (Full Data)

### Endpoint A: Get All Class Batches
```
GET /api/classes
```

### Description
Returns all class batches for the authenticated user's organization with complete data.
- **Admins/Managers**: See all class batches
- **EndUsers**: Only see class batches where they are assigned to at least one session

### Sample JSON Response
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Batch A",
    "description": "Morning Batch",
    "createdBy": "507f191e810c19729de860ec",
    "defaultTime": "09:00",
    "defaultLocation": "Room 101",
    "organizationPrefix": "ORG001",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z",
    "latestSessionDate": "2024-06-30T10:30:00.000Z",
    "firstSession": {
      "_id": "507f1f77bcf86cd799439011",
      "startDate": "2024-01-15T00:00:00.000Z",
      "endDate": "2024-06-30T00:00:00.000Z",
      "startTime": "09:00",
      "endTime": "10:30",
      "locationType": "Physical",
      "physicalLocation": "Room 101",
      "virtualLocation": null,
      "location": {
        "type": "COORDS",
        "geolocation": {
          "latitude": 28.6139,
          "longitude": 77.2090
        }
      },
      "frequency": "Weekly"
    }
  }
]
```

### Key Fields for Power BI
- `_id`: Class batch unique identifier
- `name`: Class batch name
- `description`: Class batch description
- `createdBy`: User ID who created the class batch
- `defaultTime`: Default time for sessions (HH:mm format)
- `defaultLocation`: Default location for sessions
- `organizationPrefix`: Organization identifier
- `createdAt`, `updatedAt`: Timestamps
- `latestSessionDate`: Latest end date/time among all sessions in this batch
- `firstSession`: First session details (for reference)

---

### Endpoint B: Get Single Class Batch
```
GET /api/classes/:id
```

### Description
Returns a single class batch by its ID with complete data.

### Sample JSON Response
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "name": "Batch A",
  "description": "Morning Batch",
  "createdBy": "507f191e810c19729de860ec",
  "defaultTime": "09:00",
  "defaultLocation": "Room 101",
  "organizationPrefix": "ORG001",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z"
}
```

### Key Fields for Power BI
Same as Endpoint A above (without `latestSessionDate` and `firstSession`).

---

## 2. ATTENDANCE RECORDS

### Option A: Get All Attendance for a Specific Session

#### Endpoint
```
GET /api/attendance/session/:sessionId
```

#### Description
Returns all attendance records for a specific session, including user details. 
**Access**: Manager or SuperAdmin only.

#### Sample JSON Response
```json
[
  {
    "_id": "507f1f77bcf86cd799439020",
    "checkInTime": "2024-01-15T09:05:30.000Z",
    "locationVerified": true,
    "isLate": true,
    "lateByMinutes": 5,
    "userId": {
      "_id": "507f191e810c19729de860ea",
      "email": "student1@example.com",
      "profile": {
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+1234567890"
      }
    },
    "attendanceStatus": "Present"
  },
  {
    "_id": "on-leave-507f191e810c19729de860ed",
    "checkInTime": "2024-01-15T00:00:00.000Z",
    "locationVerified": false,
    "isLate": false,
    "attendanceStatus": "On Leave",
    "userId": {
      "_id": "507f191e810c19729de860ed",
      "email": "student2@example.com",
      "profile": {
        "firstName": "Jane",
        "lastName": "Smith",
        "phone": "+1234567891"
      }
    },
    "approvedBy": {
      "_id": "507f191e810c19729de860eb",
      "email": "admin@example.com",
      "profile": {
        "firstName": "Admin",
        "lastName": "User"
      }
    }
  }
]
```

#### Key Fields for Power BI
- `_id`: Attendance record ID (or "on-leave-{userId}" for leave records)
- `checkInTime`: Timestamp when attendance was marked (UTC)
- `locationVerified`: Boolean indicating if location was verified
- `isLate`: Boolean indicating if attendance was marked late
- `lateByMinutes`: Number of minutes late (if isLate is true)
- `userId`: User object with `_id`, `email`, and `profile` (firstName, lastName, phone)
- `attendanceStatus`: "Present", "Absent", or "On Leave"
- `approvedBy`: Approver information (only for "On Leave" records)

---

### Option B: Get All Attendance for a Specific User

#### Endpoint
```
GET /api/attendance/user/:userId
```

#### Description
Returns all attendance records for a specific user, including session details.
**Access**: Manager or SuperAdmin only.

#### Sample JSON Response
```json
[
  {
    "_id": "507f1f77bcf86cd799439020",
    "userId": "507f191e810c19729de860ea",
    "sessionId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Mathematics Class",
      "description": "Advanced Calculus",
      "frequency": "Weekly",
      "startDate": "2024-01-15T00:00:00.000Z",
      "endDate": "2024-06-30T00:00:00.000Z",
      "startTime": "09:00",
      "endTime": "10:30",
      "sessionType": "PHYSICAL",
      "organizationPrefix": "ORG001"
    },
    "checkInTime": "2024-01-15T09:05:30.000Z",
    "locationVerified": true,
    "userLocation": {
      "latitude": 28.6140,
      "longitude": 77.2091
    },
    "deviceId": "device-12345",
    "createdAt": "2024-01-15T09:05:30.000Z",
    "updatedAt": "2024-01-15T09:05:30.000Z"
  }
]
```

#### Key Fields for Power BI
- `_id`: Attendance record ID
- `userId`: User ID (string)
- `sessionId`: Full session object (or null if session was deleted)
- `checkInTime`: Timestamp when attendance was marked (UTC)
- `locationVerified`: Boolean
- `isLate`: Boolean (may not be present in this endpoint)
- `lateByMinutes`: Number (may not be present in this endpoint)
- `userLocation`: Object with `latitude` and `longitude`
- `deviceId`: Device identifier used for the scan
- `createdAt`, `updatedAt`: Timestamps

---

### Option C: Get My Own Attendance (Current User)

#### Endpoint
```
GET /api/attendance/me
```

#### Description
Returns all attendance records for the currently authenticated user, including session details.

#### Sample JSON Response
```json
[
  {
    "_id": "507f1f77bcf86cd799439020",
    "userId": "507f191e810c19729de860ea",
    "sessionId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Mathematics Class",
      "description": "Advanced Calculus",
      "frequency": "Weekly",
      "startDate": "2024-01-15T00:00:00.000Z",
      "startTime": "09:00",
      "endTime": "10:30",
      "sessionType": "PHYSICAL",
      "organizationPrefix": "ORG001"
    },
    "checkInTime": "2024-01-15T09:05:30.000Z",
    "locationVerified": true,
    "userLocation": {
      "latitude": 28.6140,
      "longitude": 77.2091
    },
    "deviceId": "device-12345",
    "createdAt": "2024-01-15T09:05:30.000Z",
    "updatedAt": "2024-01-15T09:05:30.000Z"
  }
]
```

#### Key Fields for Power BI
Same as Option B above.

---

## 3. USERS (Students/All Users)

### Endpoint
```
GET /api/users/my-organization
```

### Description
Returns all users in the authenticated user's organization.

### Response Format
Returns an array of user objects.

### Sample JSON Response
```json
[
  {
    "_id": "507f191e810c19729de860ea",
    "email": "student1@example.com",
    "role": "EndUser",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890"
    },
    "registeredDeviceId": "device-12345",
    "customLeaveQuota": {
      "pl": 12,
      "cl": 12,
      "sl": 10
    },
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  },
  {
    "_id": "507f191e810c19729de860eb",
    "email": "admin@example.com",
    "role": "SuperAdmin",
    "profile": {
      "firstName": "Admin",
      "lastName": "User",
      "phone": "+1234567891"
    },
    "registeredDeviceId": null,
    "customLeaveQuota": null,
    "createdAt": "2024-01-01T09:00:00.000Z",
    "updatedAt": "2024-01-01T09:00:00.000Z"
  }
]
```

### Key Fields for Power BI
- `_id`: User unique identifier
- `email`: User email address
- `role`: SuperAdmin, CompanyAdmin, Manager, SessionAdmin, or EndUser
- `profile.firstName`: User's first name
- `profile.lastName`: User's last name
- `profile.phone`: User's phone number (optional)
- `registeredDeviceId`: Device ID if device is locked (null if unlocked)
- `customLeaveQuota`: Custom leave quota object (null if using organization defaults)
  - `pl`: Personal Leave quota
  - `cl`: Casual Leave quota
  - `sl`: Sick Leave quota
- `createdAt`, `updatedAt`: Timestamps

---

## Important Notes for Power BI

1. **Date/Time Fields**: All timestamps are in UTC format (ISO 8601). Convert to your local timezone in Power BI.

2. **Nested Objects**: Some fields contain nested objects (e.g., `profile`, `location`, `userId`, `sessionId`). You may need to expand these in Power BI.

3. **Null Values**: Some fields may be `null` or `undefined`. Handle these appropriately in your Power BI queries.

4. **Array Fields**: Fields like `assignedUsers` and `weeklyDays` are arrays. You may need to flatten these for Power BI analysis.

5. **Authentication**: Ensure you have a valid JWT token. Token expiration may require re-authentication.

6. **Base URL**: Replace with your actual API base URL (e.g., `https://api.yourdomain.com` or `http://localhost:5001`).

7. **Role-Based Access**: Some endpoints (like `/api/attendance/session/:id`) require Manager or SuperAdmin roles. Ensure your API credentials have appropriate permissions.

---

## Recommended Power BI Data Sources

1. **Sessions Table**: Use `GET /api/sessions` to get all sessions
2. **Attendance Table**: Use `GET /api/attendance/session/:id` for each session (or `GET /api/attendance/user/:id` for user-based analysis)
3. **Users Table**: Use `GET /api/users/my-organization` to get all users
4. **Class Batches Table**: Use `GET /api/classes` to get all class batches with full data

You can create relationships between these tables using:
- `userId` (from attendance) → `_id` (from users)
- `sessionId` (from attendance) → `_id` (from sessions)
- `classBatchId` (from sessions) → `_id` (from class batches)
- `createdBy` (from class batches) → `_id` (from users)

---

## ⚠️ CRITICAL REMINDER: Token Expiration

**JWT tokens expire after 7 days.** This is the most important consideration for Power BI integration:

### The Problem
- Power BI scheduled refreshes will fail if the token expires
- There is no automatic token refresh mechanism
- You must manually re-authenticate every 7 days (or before)

### Recommended Approach
1. **Create a dedicated service account** for Power BI with Manager or SuperAdmin role
2. **Set a calendar reminder** to refresh the token every 6 days
3. **Store the token securely** in Power BI's credential manager
4. **Monitor refresh failures** - 401 errors indicate token expiration

### Quick Token Refresh Steps
1. Call `POST /api/auth/login` with service account credentials
2. Get `tempToken` and `organizations` array
3. Call `POST /api/auth/select-organization` with `tempToken` and `prefix`
4. Extract the new `token` from response
5. Update Power BI data source with new token

### Future Consideration
Consider requesting an API key endpoint from the development team for long-term automated integrations. API keys are better suited for Power BI and similar tools that require persistent, non-expiring authentication.


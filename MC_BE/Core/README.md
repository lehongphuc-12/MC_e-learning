# `Core/` Directory - Core Domain Models

The `Core/` directory contains **Core Domain Models** representing database structures, enums, and system-wide core DTOs.

---

## 📂 Folder Layout

```text
Core/
├── Entities/       # Entity classes mapped to Database tables (EF Core)
│   ├── User.cs
│   ├── Role.cs
│   ├── UserProfile.cs
│   ├── RefreshToken.cs
│   └── PasswordResetToken.cs
│
├── Enums/          # System-wide Enum definitions
│   └── UserRole.cs # Learner = 1, Instructor = 2, Admin = 3
│
└── DTOs/           # Generic response wrappers used across all APIs
    └── ApiResponse.cs # Standardized response format (Success, Message, Data, Errors)
```

---

## 📌 Principles

1. **Entities (`Core/Entities`)**: Independent domain objects representing database tables in PostgreSQL.
2. **Enums (`Core/Enums`)**: Strongly-typed enumeration definitions (UserRole, CourseStatus, PaymentStatus).
3. **Core DTOs (`Core/DTOs`)**: Provides `ApiResponse<T>`, ensuring all API endpoints return a predictable JSON payload:
   ```json
   {
     "success": true,
     "message": "Operation successful",
     "data": { ... },
     "errors": []
   }
   ```

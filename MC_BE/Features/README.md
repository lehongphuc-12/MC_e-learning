# `Features/` Directory - Business Feature Modules

The `Features/` directory contains all **business feature modules** of the MSEEK E-Learning Backend.

---

## 🎯 Design Philosophy

Each subfolder inside `Features/` represents a specific **Business Domain / Feature** (Vertical Slice Architecture). All files required to deliver the feature (Controllers, Services, Interfaces, DTOs) are co-located in one place.

### Standard Feature Structure

```text
Features/
├── [FeatureName]/
│   ├── Controllers/
│   │   └── [Feature]Controller.cs        # Handles HTTP Requests & Responses
│   ├── Services/
│   │   ├── [Feature]Service.cs           # Implements business logic
│   │   └── Interfaces/
│   │       └── I[Feature]Service.cs      # Service Contract interface
│   └── DTOs/
│       └── [Feature]Dtos.cs              # Request/Response Data Transfer Objects
```

---

## 📂 Existing Feature Modules

1. **`Auth/`**: Registration, Login, Google OAuth, Refresh Token, Password Reset/Change, and User Profile management (`UserProfile`).
2. **`Admin/`**: System administration functions for Admin roles (Analytics, User Management...).
3. **`Users/`**: Common user domain operations (Retrieving user lists...).

---

## 💡 Guidelines & Best Practices

- **Cross-Feature Service Dependencies:** If the `Admin` feature needs a user service, inject `IUserService` from `MC_BE.Features.Users.Services.Interfaces`.
- **Shared Technical Services:** Utility services (File Upload, Email, Hashing) belong in `Shared/Services/`, **NOT** inside `Features/`.
- **Naming Conventions:**
  - Namespaces: `MC_BE.Features.[FeatureName].[SubFolder]` (e.g., `MC_BE.Features.Auth.Controllers`)
  - Route attributes: `[Route("api/[controller]")]`

# `Shared/` Directory - Shared Infrastructure & Technical Services

The `Shared/` directory contains **technical infrastructure services, data access contexts, repositories, middleware, and configuration settings** used across multiple features.

---

## 📂 Folder Layout

```text
Shared/
├── Services/          # Technical & utility services
│   ├── CloudinaryService.cs   # File and image upload management
│   ├── EmailService.cs        # SMTP email sending service
│   ├── TokenService.cs        # JWT & Refresh Token generation/cookies
│   ├── PasswordHasher.cs      # BCrypt password hashing & verification
│   └── Interfaces/            # Interfaces for technical services
│
├── Data/              # DbContext & Database Configurations
│   └── SmartMcDbContext.cs    # EF Core DbContext for PostgreSQL
│
├── Repositories/      # Generic Data Access Layer
│   ├── GenericRepository.cs   # Reusable CRUD & Include queries
│   ├── UnitOfWork.cs          # Transaction management
│   └── Interfaces/            # Repository contracts (IGenericRepository, IUnitOfWork)
│
├── Middleware/        # ASP.NET Core Middleware
│   └── GlobalExceptionMiddleware.cs # Unhandled exception handler
│
├── Mappers/           # AutoMapper Profiles
│   └── MappingProfile.cs
│
└── Settings/          # Strongly-typed configuration options
    ├── CloudinarySettings.cs  # Cloudinary API credentials
    └── EmailSettings.cs       # SMTP server credentials
```

---

## 📌 Guidelines

- **Infrastructure vs. Feature Services:** Place technical services (third-party integrations, security, storage) in `Shared/Services/`. Feature-specific business logic stays inside `Features/[FeatureName]/Services/`.
- **Namespaces:** Use `MC_BE.Shared.[SubFolder]` (e.g., `MC_BE.Shared.Services`, `MC_BE.Shared.Data`).

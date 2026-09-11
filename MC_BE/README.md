# MC_BE - Smart MC E-Learning API Backend

The RESTful API Backend supporting the **MSEEK E-Learning** platform, built with **ASP.NET Core 9.0** and **PostgreSQL** (Entity Framework Core).

---

## 🏛️ Project Architecture (Feature-Driven Architecture)

This project adopts **Feature-Driven Architecture** (Vertical Slice Architecture) combined with Clean Code and SOLID principles. Each business module is encapsulated inside the `Features/` directory, ensuring high maintainability, easy scalability, and clean team collaboration.

### High-Level Folder Structure

```text
MC_BE/
├── Core/                # Core domain components (Entities, Enums, Core DTOs)
├── Features/            # Business feature modules (Auth, Admin, Users, Courses...)
├── Shared/              # Shared infrastructure services, DbContext, Repositories, Middleware
├── Migrations/          # EF Core Database Migrations
├── Program.cs           # Dependency Injection & HTTP Pipeline Configuration
└── appsettings.json     # Environment configuration & Connection strings
```

---

## 📁 Key Directories Overview

| Directory | Responsibilities |
| :--- | :--- |
| **[`Core/`](file:///d:/FPT%20University%20Project/MC_e-learning/MC_BE/Core/README.md)** | Contains database Entities, Enums, and generic system-wide DTOs (`ApiResponse`). |
| **[`Features/`](file:///d:/FPT%20University%20Project/MC_e-learning/MC_BE/Features/README.md)** | Contains all business features. Each feature encapsulates its own Controllers, Services, and DTOs. |
| **[`Shared/`](file:///d:/FPT%20University%20Project/MC_e-learning/MC_BE/Shared/README.md)** | Contains shared technical infrastructure (Cloudinary, Email, JWT Token, Hasher, DbContext, Repositories, Middleware). |

---

## 🚀 How to Add a New Feature (e.g., `Courses`)

1. Create a new directory under `Features/`: `Features/Courses/`
2. Create standard subdirectories:
   - `Features/Courses/Controllers/CourseController.cs`
   - `Features/Courses/Services/CourseService.cs` & `Interfaces/ICourseService.cs`
   - `Features/Courses/DTOs/CourseDtos.cs`
3. Register the service in `Program.cs`:
   ```csharp
   builder.Services.AddScoped<ICourseService, CourseService>();
   ```
4. Build and verify using `dotnet build`.

---

## 🛠️ Local Development Setup

```bash
# 1. Navigate to backend folder
cd MC_BE

# 2. Run the project in watch mode (Hot Reload)
dotnet watch

# 3. Open Swagger UI
https://localhost:7051/swagger
```

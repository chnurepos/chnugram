// This file documents the EF Core migration approach.
// Run: dotnet ef migrations add InitialCreate --project CHNUgram.API
// Run: dotnet ef database update --project CHNUgram.API
//
// The database schema is also available in /database/init.sql for direct SQL initialization.
// The AppDbContext.cs contains all the entity configurations.
//
// The application auto-migrates on startup in Program.cs using db.Database.Migrate()

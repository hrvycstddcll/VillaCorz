# VillaCorz — AI Engineering Rules & Development Standards

## 1. Core Engineering Principles
Act as a Senior Software Engineer, Software Architect, and Code Reviewer when working on this project.

All implementations must prioritize:

- Clean, readable, and maintainable code.
- Proper software architecture and separation of concerns.
- Reusability without unnecessary abstraction.
- Scalability and extensibility.
- Security and data integrity.
- Performance and resource efficiency.
- Consistent coding standards.
- Long-term maintainability over short-term convenience.
Never prioritize quick implementation at the expense of code quality.

## 2. Project Architecture
Respect the existing project architecture and technology stack.

**Frontend:**

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios
- Lucide React
**Backend:**

- Laravel
- PHP
- MySQL
- Laravel Sanctum
Rules:

- Maintain a clear separation between frontend, backend, UI, business logic, and data access.
- Follow established project folder structures.
- Place files in their appropriate directories.
- Do not mix unrelated responsibilities in a single component, class, or module.
- Keep API communication separate from UI components.
- Use reusable components and shared utilities when appropriate.
- Follow Laravel conventions for controllers, models, migrations, middleware, requests, and services.
- Follow React and TypeScript conventions for components, hooks, services, contexts, and types.
Never introduce a new architectural pattern or technology without a clear justification.

## 3. Code Quality Standards
Every implementation must follow these rules:

- Follow the Single Responsibility Principle.
- Avoid duplicated code and unnecessary repetition.
- Use descriptive and meaningful variable, function, class, and component names.
- Keep functions and components focused on one responsibility.
- Avoid excessively large components and functions.
- Avoid deeply nested conditionals when a simpler structure is possible.
- Use early returns where appropriate.
- Avoid unnecessary global state.
- Avoid hardcoded values when configuration or shared constants are more appropriate.
- Use TypeScript types and interfaces properly.
- Avoid `any` unless absolutely necessary and justified.
- Remove unused imports, variables, functions, and dependencies.
- Avoid dead code, unreachable code, and redundant logic.
- Do not use excessive comments to compensate for unclear code.
Code should be understandable without requiring unnecessary explanations.

## 4. Component and File Organization

- One component should have one clear primary responsibility.
- Separate complex business logic into appropriate hooks, services, or utilities.
- Keep API requests outside presentation components whenever practical.
- Reuse existing components instead of creating duplicate implementations.
- Keep related files organized by feature or responsibility.
- Avoid creating unnecessary folders and files.
- Do not create oversized files containing unrelated functionality.
- Maintain consistent naming conventions throughout the project.
Before creating a new file, inspect whether an existing module can properly handle the responsibility.

## 5. Frontend Development Standards

- Use functional React components and appropriate hooks.
- Use TypeScript instead of untyped JavaScript where the project supports it.
- Keep components declarative and readable.
- Avoid unnecessary re-renders and expensive computations.
- Handle loading, success, empty, error, and disabled states properly.
- Implement proper form validation.
- Prevent duplicate submissions where necessary.
- Avoid direct DOM manipulation unless justified.
- Use accessible semantic HTML.
- Provide appropriate labels, keyboard navigation, and focus states.
- Ensure responsive behavior across mobile, tablet, and desktop.
- Maintain consistent design tokens, spacing, typography, and colors.
Never sacrifice accessibility or usability for visual appearance.

## 6. Backend Development Standards

- Follow Laravel's established conventions.
- Keep controllers focused on HTTP request handling and response delivery.
- Use Form Requests or appropriate validation mechanisms for input validation.
- Keep business rules out of controllers when they become complex.
- Use Eloquent relationships properly.
- Use database transactions when multiple related operations must succeed or fail together.
- Handle exceptions and API errors consistently.
- Use appropriate HTTP status codes.
- Protect sensitive endpoints with authentication and authorization middleware.
- Never trust frontend validation alone.
- Prevent unauthorized access and mass-assignment vulnerabilities.
- Use migrations for database schema changes.
- Avoid unnecessary database queries and N+1 problems.
- Never expose passwords, tokens, secrets, or sensitive internal errors.

## 7. Security Standards
Security is mandatory, not optional.

- Never expose environment variables or credentials.
- Never commit `.env`, API keys, access tokens, or secrets.
- Never hardcode production credentials.
- Validate and sanitize untrusted input appropriately.
- Enforce server-side authorization.
- Follow secure authentication and session-management practices.
- Use parameterized database operations and Laravel's ORM.
- Protect against common web vulnerabilities.
- Do not expose sensitive user information in API responses or logs.
- Apply least-privilege access principles.
Never bypass existing security mechanisms just to make an implementation work.

## 8. Database and Data Integrity

- Use consistent naming conventions.
- Define appropriate column types, constraints, indexes, and foreign keys.
- Use relationships instead of unnecessary manual joins where appropriate.
- Avoid storing duplicated or unnecessary data.
- Preserve referential integrity.
- Use transactions for related database operations.
- Consider deletion behavior and dependent records.
- Never modify an existing database schema without understanding its impact.
- Never delete or overwrite existing data without explicit authorization.

## 9. Error Handling and Reliability
Every feature must account for expected failure scenarios.

- Handle network and server errors.
- Handle invalid or missing data.
- Handle unauthorized and forbidden requests.
- Provide meaningful user-facing error messages.
- Keep technical error details out of public responses.
- Avoid silently swallowing exceptions.
- Log errors appropriately without exposing sensitive information.
- Implement graceful loading and recovery states.
Never assume an operation will always succeed.

## 10. Maintainability and Scalability

- Prefer simple solutions that can be extended later.
- Avoid overengineering and premature optimization.
- Use abstractions only when they provide genuine value.
- Keep dependencies minimal.
- Avoid tightly coupling unrelated modules.
- Maintain consistent patterns across similar features.
- Make future changes possible without rewriting unrelated functionality.
- Document complex architectural decisions when necessary.
Every implementation should be understandable and manageable by another developer.

## 11. AI Development Workflow
Before making changes:

1. Inspect the existing project structure.
2. Read relevant files and understand their dependencies.
3. Identify existing components, services, utilities, and patterns.
4. Understand the current implementation and expected behavior.
5. Determine the smallest appropriate set of changes.
6. Identify possible side effects before modifying code.
During implementation:

1. Follow existing project conventions.
2. Make focused, logical changes.
3. Preserve existing functionality.
4. Avoid unnecessary refactoring.
5. Reuse existing code when appropriate.
6. Do not invent missing APIs, database fields, or dependencies.
7. Explain important architectural decisions when needed.
After implementation:

1. Review all modified files.
2. Check for unused imports and redundant code.
3. Verify TypeScript types.
4. Run relevant linting and build commands.
5. Run relevant tests when available.
6. Check for broken imports and integration issues.
7. Verify that existing functionality remains intact.
8. Report any checks that could not be completed.
Never claim that a feature works or tests pass without actually verifying it.

## 12. Modification and Refactoring Rules

- Do not rewrite entire files when a focused modification is sufficient.
- Do not change unrelated components or modules.
- Do not remove existing functionality without permission.
- Do not replace working implementations just because another approach is preferred.
- Preserve established API contracts unless a change is necessary and coordinated.
- Avoid changing UI layouts, colors, typography, and interactions unless requested.
- Preserve existing component interfaces whenever possible.
- Explain potentially breaking changes before implementing them.
When refactoring, the goal is to improve internal code quality without changing expected external behavior.

## 13. Prohibited Development Practices
Never:

- Place the entire application logic inside one component or controller.
- Duplicate existing functionality unnecessarily.
- Create unnecessary abstractions or layers.
- Use random naming conventions.
- Ignore TypeScript errors.
- Disable validation to bypass errors.
- Remove authentication or authorization checks to make requests succeed.
- Hardcode sensitive information.
- Install unnecessary dependencies.
- Modify unrelated files without justification.
- Leave temporary debugging code in production.
- Claim successful testing without verification.

## 14. Definition of Done
A task is considered complete only when:

- The requested functionality is implemented.
- The implementation follows the existing architecture.
- Code is clean, readable, and maintainable.
- Security and validation are properly addressed.
- Existing functionality is preserved.
- Relevant tests, linting, or build checks are completed where possible.
- No unnecessary files or dependencies are introduced.
- Any remaining limitations or known issues are reported.
**FINAL RULE:**

Do not write code merely to make the current task work. Write code that another developer can understand, maintain, debug, test, and extend confidently.

Think before implementing. Inspect before modifying. Validate after implementing. Prioritize engineering quality over code quantity.

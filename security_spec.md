# Security Specification - Autel MaxiSYS

## Data Invariants
1. A user profile must have a `uid` that matches the authenticated user's UID.
2. A user profile cannot be created by another user.
3. Users can only read their own profile.
4. Users can only update their own profile.
5. Users cannot delete their profile (or maybe they can, but let's stick to update for now).

## The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempt to create a profile with a `uid` different from `request.auth.uid`.
2. **Unauthorized Read**: Attempt to read another user's profile.
3. **Unauthorized Update**: Attempt to update another user's profile.
4. **Invalid Type**: Attempt to set `email` to a boolean.
5. **Too Long String**: Attempt to set `displayName` to a 2MB string.
6. **Bypassing Invariants**: Attempt to update `uid` to a different value after creation.
7. **Malformed ID**: Attempt to use an invalid character in a document ID.
8. **Shadow Field Injection**: Attempt to inject `isAdmin: true` into a profile.
9. **State Locking Violation**: (Not applicable yet as there's no terminal status in User).
10. **Orphaned Record**: (Not applicable yet as there are no relations).
11. **System Field Modification**: (Not yet defined).
12. **Anonymous Access**: Attempt to read/write as an unauthenticated user.

## Implementation Plan
- Default deny catch-all.
- Reusable helpers for `isSignedIn`, `isValidId`, `isOwner`.
- Strict schema validation for `User` entity.
- Lock `uid` and `email` as immutable during updates.
- Use `affectedKeys().hasOnly()` for controlled updates.

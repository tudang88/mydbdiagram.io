# Test Examples for MANY_TO_MANY Detection

This directory contains complex database schema examples to test the automatic MANY_TO_MANY relationship detection feature.

## Files

### `complex-example.dbml`
A DBML format example with:
- **10 tables**: users, roles, user_roles, posts, categories, tags, post_tags, comments, likes, media, subscriptions
- **2 junction tables** that should be detected as MANY_TO_MANY:
  - `user_roles`: MANY_TO_MANY between `users` and `roles`
  - `post_tags`: MANY_TO_MANY between `posts` and `tags`
- **Multiple ONE_TO_MANY relationships**
- **Self-referencing relationships** (categories.parent_id, comments.parent_id)

### `complex-example.sql`
A SQL DDL format example with the same schema structure.

## Expected Behavior

When parsing these examples, the parser should:

1. **Detect junction tables**:
   - `user_roles` has composite primary key (user_id, role_id) and 2 foreign keys
   - `post_tags` has composite primary key (post_id, tag_id) and 2 foreign keys

2. **Create MANY_TO_MANY relationships**:
   - `users` <-> `roles` (via `user_roles`)
   - `posts` <-> `tags` (via `post_tags`)

3. **Hide junction table relationships**:
   - The individual ONE_TO_MANY relationships from `user_roles` to `users` and `roles` should be hidden
   - The individual ONE_TO_MANY relationships from `post_tags` to `posts` and `tags` should be hidden

4. **Keep other relationships**:
   - All other ONE_TO_MANY relationships should remain visible

## How to Test

1. Copy the content from `complex-example.dbml` or `complex-example.sql`
2. Paste it into the SQL/DBML editor in the application
3. Check the console logs for:
   - `✅ Created MANY_TO_MANY relationship: users <-> roles`
   - `✅ Created MANY_TO_MANY relationship: posts <-> tags`
4. Verify in the diagram:
   - Direct MANY_TO_MANY lines between `users` and `roles`
   - Direct MANY_TO_MANY lines between `posts` and `tags`
   - No visible lines from `user_roles` or `post_tags` junction tables
   - Other relationships are still visible

## Junction Table Pattern

A junction table is detected when:
- Has exactly 2 relationships from this table to 2 different tables
- Both relationship columns are primary keys (composite key pattern)
- Result: MANY_TO_MANY between the two target tables


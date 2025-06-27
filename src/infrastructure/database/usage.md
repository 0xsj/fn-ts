Create a new migration file with a new timestamp:

npm run migration:create update_users_add_avatar_field
Creates: 001751234567_update_users_add_avatar_field.ts

In the up() function, use:

alterTable() to modify existing tables
addColumn() to add new columns
dropColumn() to remove columns
modifyColumn() to change column types/constraints
addForeignKeyConstraint() to add new relationships
dropConstraint() to remove constraints
createIndex() / dropIndex() for index changes

In the down() function, reverse the changes
Run npm run migrate to apply

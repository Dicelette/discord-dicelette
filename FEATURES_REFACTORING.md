# Features Refactoring Progress

## Overview
This document tracks the refactoring of the bot's features directory from a module-based pattern to a class-based pattern.

## Goals
1. ✅ Create a base `Feature` class that all features extend
2. ✅ Consolidate each feature into a single file with a class implementation
3. ✅ Standardize function naming across features
4. ⏳ Remove duplicate code patterns
5. ⏳ Complete refactoring of all features

## Progress

### Completed ✅

#### Base Feature Class (`features/base.ts`)
- Created abstract `Feature` class with common method signatures
- Provides template for `start()`, `edit()`, and `validate()` methods
- All feature classes extend this base class

#### Avatar Feature (`features/avatar.ts`)
- ✅ Consolidated from `features/avatar/` subdirectory
- ✅ Implemented `AvatarFeature` class extending `Feature`
- ✅ Migrated `start()` method from `show_modals.ts`
- ✅ Migrated `edit()` method from `validation.ts`
- ✅ Exports singleton instance for use across the codebase
- ✅ Maintains backward compatibility with existing imports

#### Move Feature (`features/move.ts`)
- ✅ Consolidated from `features/move/` subdirectory
- ✅ Implemented `MoveFeature` class extending `Feature`
- ✅ Migrated `start()` method from `show_modals.ts`
- ✅ Migrated `validate()` method from `validation.ts`
- ✅ Exports singleton instance for use across the codebase
- ✅ Maintains backward compatibility with existing imports

#### Rename Feature (`features/rename.ts`)
- ✅ Consolidated from `features/rename/` subdirectory
- ✅ Implemented `RenameFeature` class extending `Feature`
- ✅ Migrated `start()` method from `show_modals.ts`
- ✅ Migrated `validate()` method from `validation.ts`
- ✅ Exports singleton instance for use across the codebase
- ✅ Maintains backward compatibility with existing imports

### Remaining Work ⏳

#### Stats Feature (`features/stats/`)
- **Status**: Not yet refactored (keeping module structure)
- **Complexity**: ~800 lines combined
- **Files**: `show_modals.ts`, `validation.ts`
- **Key Functions**: 
  - `show()`, `edit()` (modals)
  - `register()`, `validateEdit()`, `validateByModeration()` (validation)
  - `couldBeValidated()`, `cancelStatsModeration()` (moderation)
- **Dependencies**: Uses `Macro.buttons()`
- **Recommendation**: Refactor once Macro is complete

#### Macro Feature (`features/macro/`)
- **Status**: Not yet refactored (keeping module structure)
- **Complexity**: ~1200 lines combined
- **Files**: `show_modals.ts`, `record.ts`, `validation.ts`
- **Key Functions**:
  - `add()`, `edit()` (modals)
  - `store()`, `buttons()`, `findDuplicate()` (record)
  - `validate()`, `couldBeValidatedDice()`, `cancelDiceModeration()` (validation)
  - `couldBeValidatedDiceAdd()`, `cancelDiceAddModeration()` (validation)
- **Dependencies**: `buttons()` function is used by Stats and User features
- **Recommendation**: High priority for refactoring as other features depend on it

#### User Feature (`features/user/`)
- **Status**: Not yet refactored (keeping module structure)
- **Complexity**: ~720 lines combined
- **Files**: `show_modals.ts`, `record.ts`, `validation.ts`
- **Key Functions**:
  - `start()` (modals)
  - `pageNumber()`, `firstPage()` (record)
  - `continuePage()`, `button()`, `sendValidationMessage()`, `validateUser()` (validation)
- **Dependencies**: Uses `Stats.register()`, `Stats.show()`, `Macro.buttons()`
- **Recommendation**: Refactor after Stats and Macro

## Cleanup Tasks
- [ ] Remove old `features/avatar/` subdirectory once Avatar refactoring is confirmed working
- [ ] Remove old `features/move/` subdirectory once Move refactoring is confirmed working
- [ ] Remove old `features/rename/` subdirectory once Rename refactoring is confirmed working

## Pattern Established

### Class Structure
```typescript
export class FeatureNameFeature extends Feature {
    // Public methods matching the Feature interface
    async start?(...) { ... }
    async edit?(...) { ... }
    async validate?(...) { ... }
    
    // Private helper methods
    private async helperMethod(...) { ... }
}

// Export singleton instance
export const FeatureName = new FeatureNameFeature();
```

### Usage Pattern
```typescript
// In on_interaction.ts or other files
import { Avatar, Move, Rename } from "features";

// Method calls
await Avatar.start(interaction, ul, user, db);
await Move.validate(interaction, ul, client);
await Rename.start(interaction, ul, user, db);
```

## Benefits of Refactoring
1. **Consistency**: All features follow the same structure
2. **Encapsulation**: Related functionality grouped in classes
3. **Maintainability**: Easier to understand and modify feature code
4. **Type Safety**: Better TypeScript support with class methods
5. **Reduced Duplication**: Common patterns extracted to base class

## Next Steps
1. Test the refactored features (Avatar, Move, Rename) in production
2. Once validated, remove old subdirectories
3. Continue with Macro feature refactoring (highest priority due to dependencies)
4. Then refactor User and Stats features
5. Update all import statements across the codebase
6. Run full test suite to ensure no regressions

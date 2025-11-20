# Code Quality Quick Reference

## Apply All Fixes
```powershell
cd C:\dev-local\outlook-mcp
.\apply-code-quality-fixes.ps1
```

## Linting Commands
```powershell
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues  
npm run lint:report   # Generate report
```

## What Was Fixed

### Critical
1. Variable declaration order in config.js
2. Duplicate CALENDAR_SELECT_FIELDS removed
3. Magic numbers extracted to constants
4. Send email token bug fixed

### Added
- ESLint configuration
- Linting scripts  
- Code quality analysis document
- Input validation limits in config

## Coding Standards

### Naming
- Constants: `MAX_RETRY_COUNT`
- Variables: `userName`
- Functions: `getUserData()`  
- Classes: `UserManager`

### Error Handling
```javascript
async function handler(args) {
  try {
    const accessToken = await ensureAuthenticated();
    // ... work
    return { content: [{ type: 'text', text: 'Success' }] };
  } catch (error) {
    return { 
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true 
    };
  }
}
```

## Next Steps
1. Run apply script
2. Run `npm run lint:fix`
3. Fix remaining errors
4. Review CODE_QUALITY_ANALYSIS.md
5. Restart MCP server

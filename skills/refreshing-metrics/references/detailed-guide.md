# Refreshing Metrics - Detailed Guide

**Response**:
- Skip "By Roadmap Phase" section in metrics
- Add note: "⚠️ Specs not labeled with roadmap phases - consider adding phase labels"

### Next Steps File Uses Custom Structure

**Situation**: User modified Next Steps structure significantly

**Response**:
1. Detect standard sections (✅ ⚠️ ❌)
2. Update Executive Summary only
3. Leave custom sections untouched
4. Add note: "Custom Next Steps structure detected - manual review recommended"

### Conflicting Data

**Situation**: Spec says "closed" but has open issues

**Response**:
- Mark as partially implemented (⚠️)
- Add note: "Spec closed but [N] issues remain open"
- Suggest user review

## Success Criteria

Metrics refresh is complete when:

- [ ] Issues README metrics updated with current counts
- [ ] Issues README "Last Updated" date set to today
- [ ] Specifications README metrics updated
- [ ] Specifications README "Last Updated" date set to today
- [ ] Next Steps executive summary updated with current %
- [ ] Next Steps "Last Updated By" set to "Claude Code (refreshing-metrics skill)"
- [ ] Constitutional compliance % calculated and updated
- [ ] Top projects list updated
- [ ] Update report generated and presented

## Automation Frequency

**Recommended schedule**:
- **Manual refresh**: When metrics seem stale (>30 days)
- **After major milestones**: Spec completion, phase transitions
- **Monthly**: Regular cadence for project health visibility
- **Before reviews**: Prior to stakeholder reviews or planning sessions

**Can be triggered by**:
- Direct invocation: "Refresh governance metrics"
- Housekeeping skill: As part of regular cleanup
- verifying-governance skill: If metrics flagged as stale

## Related Skills

- **verifying-governance** - Detects stale metrics and recommends this skill
- **housekeeping** - Can invoke this as part of regular maintenance
- **checking-constitutional-alignment** - Uses compliance metrics calculated here

## Important Notes

**Read-only scanning**: This skill uses MCP `issues_list` and `issues_search` (read operations only) - never modifies issue data, only updates metric sections in markdown files.

**Preserve user content**: When updating README files, only replace metric sections - never delete user-added content.

**Percentage rounding**: Always round to nearest integer for readability.

**Trend indicators**: Only show trends if you have historical data to compare.

## Remember

Accurate metrics are essential for governance effectiveness. Stale data leads to poor decisions. Make refresh easy and automatic so it becomes routine maintenance, not a burden.

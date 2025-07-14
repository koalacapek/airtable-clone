import type { Column } from "@prisma/client";

// New filter structure interface
export interface IFilterCondition {
  column: string;
  operator: string;
  value?: string;
  logicalOperator?: "AND" | "OR";
}

export interface IAdvancedFilters {
  logicalType: "AND" | "OR";
  conditions: IFilterCondition[];
}

// New function to handle advanced filters with logical operators
export const handleAdvancedFilterQuery = (
  filters: IAdvancedFilters,
  columns: Column[],
  paramIndex: number,
): {
  condition: string;
  newParamIndex: number;
  moreParams: (string | number | null)[];
} => {
  const conditions: string[] = [];
  const moreParams: (string | number | null)[] = [];
  let currentParamIndex = paramIndex;

  for (const filterCondition of filters.conditions) {
    if (!filterCondition) continue;

    const filterColumn = columns.find(
      (col) => col.name === filterCondition.column,
    );
    if (!filterColumn) continue;

    const {
      condition,
      newParamIndex,
      moreParams: conditionParams,
    } = handleChooseFilterQuery(
      filterCondition.operator,
      filterCondition.value ?? "",
      filterColumn,
      currentParamIndex,
    );

    if (condition) {
      conditions.push(condition);
      moreParams.push(...conditionParams);
      currentParamIndex = newParamIndex;
    }
  }

  if (conditions.length === 0) {
    return { condition: "", newParamIndex: currentParamIndex, moreParams: [] };
  }

  // Build the final condition with logical operators
  let finalCondition = conditions[0] ?? "";

  for (let i = 1; i < conditions.length; i++) {
    const filterCondition = filters.conditions[i];
    const logicalOp = filterCondition?.logicalOperator ?? "AND";
    finalCondition += ` ${logicalOp} ${conditions[i]}`;
  }

  // Wrap in parentheses if there are multiple conditions
  if (conditions.length > 1) {
    finalCondition = `(${finalCondition})`;
  }

  return {
    condition: finalCondition,
    newParamIndex: currentParamIndex,
    moreParams,
  };
};

// Updated function to handle both old and new filter formats
export const processFilters = (
  filters: Record<string, unknown>,
  columns: Column[],
  paramIndex: number,
): {
  condition: string;
  newParamIndex: number;
  moreParams: (string | number | null)[];
} => {
  // Check if it's the new advanced filter structure
  if (
    filters.logicalType &&
    filters.conditions &&
    Array.isArray(filters.conditions)
  ) {
    return handleAdvancedFilterQuery(
      filters as unknown as IAdvancedFilters,
      columns,
      paramIndex,
    );
  }

  // Handle legacy filter structure
  const filterConditions: string[] = [];
  const moreParams: (string | number | null)[] = [];
  let currentParamIndex = paramIndex;

  for (const [filterColumnName, filterConfig] of Object.entries(filters)) {
    const filterConfigsArray = Array.isArray(filterConfig)
      ? (filterConfig as { op: string; value?: string }[])
      : [filterConfig as { op: string; value?: string }];

    const filterColumn = columns.find((col) => col.name === filterColumnName);
    if (!filterColumn) continue;

    for (const { op, value } of filterConfigsArray) {
      const {
        condition,
        newParamIndex,
        moreParams: conditionParams,
      } = handleChooseFilterQuery(op, value!, filterColumn, currentParamIndex);

      moreParams.push(...conditionParams);
      currentParamIndex = newParamIndex;

      if (condition) {
        filterConditions.push(condition);
      }
    }
  }

  const finalCondition =
    filterConditions.length > 0 ? filterConditions.join(" AND ") : "";

  return {
    condition: finalCondition,
    newParamIndex: currentParamIndex,
    moreParams,
  };
};

export const handleChooseFilterQuery = (
  op: string,
  value: string,
  filterColumn: Column,
  paramIndex: number,
): {
  condition: string;
  newParamIndex: number;
  moreParams: (string | number | null)[];
} => {
  let condition = "";
  const moreParams: (string | number | null)[] = [];

  switch (op) {
    case "is_empty":
      condition = `NOT EXISTS (
                  SELECT 1 FROM "Cell" fc 
                  WHERE fc."rowId" = r.id 
                  AND fc."columnId" = $${paramIndex} 
                  AND fc.value IS NOT NULL 
                  AND fc.value != ''
                )`;
      moreParams.push(filterColumn.id);
      paramIndex++;
      break;

    case "is_not_empty":
      condition = `EXISTS (
                  SELECT 1 FROM "Cell" fc 
                  WHERE fc."rowId" = r.id 
                  AND fc."columnId" = $${paramIndex} 
                  AND fc.value IS NOT NULL 
                  AND fc.value != ''
                )`;
      moreParams.push(filterColumn.id);
      paramIndex++;
      break;

    case "contains":
      condition = `EXISTS (
                  SELECT 1 FROM "Cell" fc 
                  WHERE fc."rowId" = r.id 
                  AND fc."columnId" = $${paramIndex} 
                  AND LOWER(COALESCE(fc.value, '')) LIKE LOWER($${paramIndex + 1})
                )`;
      moreParams.push(filterColumn.id, `%${value}%`);
      paramIndex += 2;
      break;

    case "not_contains":
      condition = `NOT EXISTS (
                  SELECT 1 FROM "Cell" fc 
                  WHERE fc."rowId" = r.id 
                  AND fc."columnId" = $${paramIndex} 
                  AND LOWER(COALESCE(fc.value, '')) LIKE LOWER($${paramIndex + 1})
                )`;
      moreParams.push(filterColumn.id, `%${value}%`);
      paramIndex += 2;
      break;

    case "equal":
      condition = `EXISTS (
                  SELECT 1 FROM "Cell" fc 
                  WHERE fc."rowId" = r.id 
                  AND fc."columnId" = $${paramIndex} 
                  AND COALESCE(fc.value, '') = $${paramIndex + 1}
                )`;
      moreParams.push(filterColumn.id, value ?? "");
      paramIndex += 2;
      break;

    case "greater":
      if (filterColumn.type === "NUMBER") {
        condition = `EXISTS (
                    SELECT 1 FROM "Cell" fc 
                    WHERE fc."rowId" = r.id 
                    AND fc."columnId" = $${paramIndex} 
                    AND CAST(COALESCE(fc.value, '0') AS DECIMAL) > CAST($${paramIndex + 1} AS DECIMAL)
                  )`;
      } else {
        condition = `EXISTS (
                    SELECT 1 FROM "Cell" fc 
                    WHERE fc."rowId" = r.id 
                    AND fc."columnId" = $${paramIndex} 
                    AND COALESCE(fc.value, '') > $${paramIndex + 1}
                  )`;
      }
      moreParams.push(filterColumn.id, value ?? "0");
      paramIndex += 2;
      break;

    case "smaller":
      if (filterColumn.type === "NUMBER") {
        condition = `EXISTS (
                    SELECT 1 FROM "Cell" fc 
                    WHERE fc."rowId" = r.id 
                    AND fc."columnId" = $${paramIndex} 
                    AND CAST(COALESCE(fc.value, '0') AS DECIMAL) < CAST($${paramIndex + 1} AS DECIMAL)
                  )`;
      } else {
        condition = `EXISTS (
                    SELECT 1 FROM "Cell" fc 
                    WHERE fc."rowId" = r.id 
                    AND fc."columnId" = $${paramIndex} 
                    AND COALESCE(fc.value, '') < $${paramIndex + 1}
                  )`;
      }
      moreParams.push(filterColumn.id, value ?? "0");
      paramIndex += 2;
      break;
  }

  return { condition, newParamIndex: paramIndex, moreParams };
};

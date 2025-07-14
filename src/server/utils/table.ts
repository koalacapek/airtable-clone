import type { Column } from "@prisma/client";

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

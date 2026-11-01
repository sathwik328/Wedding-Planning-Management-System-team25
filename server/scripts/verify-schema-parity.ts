import pkg from "@prisma/internals";
const { getDMMF } = pkg;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DetailedParityMismatch {
  model: string;
  field?: string;
  attribute: string;
  direction: "SQLITE_TO_POSTGRES" | "POSTGRES_TO_SQLITE";
  sqliteValue: unknown;
  postgresValue: unknown;
  severity: "CRITICAL" | "INTENTIONAL_PROVIDER_EXCEPTION";
  explanation: string;
}

export async function verifyCompleteDmmfSchemaParity(): Promise<{
  isParityValid: boolean;
  mismatches: DetailedParityMismatch[];
}> {
  const sqliteSchemaPath = path.join(__dirname, "../prisma/schema.prisma");
  const postgresSchemaPath = path.join(__dirname, "../prisma/schema.postgres.prisma");

  const sqliteContent = fs.readFileSync(sqliteSchemaPath, "utf-8");
  const postgresContent = fs.readFileSync(postgresSchemaPath, "utf-8");

  const [sqliteDmmf, postgresDmmf] = await Promise.all([
    getDMMF({ datamodel: sqliteContent }),
    getDMMF({ datamodel: postgresContent })
  ]);

  const mismatches: DetailedParityMismatch[] = [];

  const sModels = new Map(sqliteDmmf.datamodel.models.map((m) => [m.name, m]));
  const pModels = new Map(postgresDmmf.datamodel.models.map((m) => [m.name, m]));

  // 1. Model Existence: Direction SQLite -> PostgreSQL
  for (const modelName of sModels.keys()) {
    if (!pModels.has(modelName)) {
      mismatches.push({
        model: modelName,
        attribute: "MODEL_EXISTENCE",
        direction: "SQLITE_TO_POSTGRES",
        sqliteValue: true,
        postgresValue: false,
        severity: "CRITICAL",
        explanation: `Model "${modelName}" exists in SQLite schema but is missing from PostgreSQL schema`
      });
    }
  }

  // 1. Model Existence: Direction PostgreSQL -> SQLite
  for (const modelName of pModels.keys()) {
    if (!sModels.has(modelName)) {
      mismatches.push({
        model: modelName,
        attribute: "MODEL_EXISTENCE",
        direction: "POSTGRES_TO_SQLITE",
        sqliteValue: false,
        postgresValue: true,
        severity: "CRITICAL",
        explanation: `Model "${modelName}" exists in PostgreSQL schema but is missing from SQLite schema`
      });
    }
  }

  // 2. Comprehensive Model & Field Comparison
  for (const [modelName, sm] of sModels.entries()) {
    const pm = pModels.get(modelName);
    if (!pm) continue;

    // Model dbName
    if (sm.dbName !== pm.dbName) {
      mismatches.push({
        model: modelName,
        attribute: "MODEL_DB_NAME",
        direction: "SQLITE_TO_POSTGRES",
        sqliteValue: sm.dbName,
        postgresValue: pm.dbName,
        severity: "CRITICAL",
        explanation: `Table mapping mismatch (@@map) on model "${modelName}"`
      });
    }

    // Model Composite Primary Key (@@id)
    if (JSON.stringify(sm.primaryKey) !== JSON.stringify(pm.primaryKey)) {
      mismatches.push({
        model: modelName,
        attribute: "COMPOSITE_PRIMARY_KEY",
        direction: "SQLITE_TO_POSTGRES",
        sqliteValue: sm.primaryKey,
        postgresValue: pm.primaryKey,
        severity: "CRITICAL",
        explanation: `Composite primary key mismatch on model "${modelName}"`
      });
    }

    // Model Composite Unique Constraints (@@unique)
    if (JSON.stringify(sm.uniqueFields) !== JSON.stringify(pm.uniqueFields)) {
      mismatches.push({
        model: modelName,
        attribute: "COMPOSITE_UNIQUE_FIELDS",
        direction: "SQLITE_TO_POSTGRES",
        sqliteValue: sm.uniqueFields,
        postgresValue: pm.uniqueFields,
        severity: "CRITICAL",
        explanation: `Composite unique constraint mismatch on model "${modelName}"`
      });
    }

    // Model Indexes (@@index) - Checking name, fields, and type
    const normalizeIndexes = (indexes: any[]) =>
      (indexes || []).map((idx) => ({ name: idx.name, fields: idx.fields, type: idx.type })).sort();

    const sIndexes = JSON.stringify(normalizeIndexes((sm as any).indexes));
    const pIndexes = JSON.stringify(normalizeIndexes((pm as any).indexes));
    if (sIndexes !== pIndexes) {
      mismatches.push({
        model: modelName,
        attribute: "INDEXES",
        direction: "SQLITE_TO_POSTGRES",
        sqliteValue: sIndexes,
        postgresValue: pIndexes,
        severity: "CRITICAL",
        explanation: `Index mismatch on model "${modelName}"`
      });
    }

    const sFields = new Map(sm.fields.map((f) => [f.name, f]));
    const pFields = new Map(pm.fields.map((f) => [f.name, f]));

    // Check Fields: SQLite -> PostgreSQL
    for (const [fieldName, sf] of sFields.entries()) {
      const pf = pFields.get(fieldName);
      if (!pf) {
        mismatches.push({
          model: modelName,
          field: fieldName,
          attribute: "FIELD_EXISTENCE",
          direction: "SQLITE_TO_POSTGRES",
          sqliteValue: true,
          postgresValue: false,
          severity: "CRITICAL",
          explanation: `Field "${fieldName}" exists in SQLite model "${modelName}" but missing in PostgreSQL`
        });
        continue;
      }

      // Compare attributes
      const compareFieldAttr = (attr: string, sVal: unknown, pVal: unknown) => {
        const sSerialized = JSON.stringify(sVal);
        const pSerialized = JSON.stringify(pVal);
        if (sSerialized !== pSerialized) {
          mismatches.push({
            model: modelName,
            field: fieldName,
            attribute: attr,
            direction: "SQLITE_TO_POSTGRES",
            sqliteValue: sVal,
            postgresValue: pVal,
            severity: "CRITICAL",
            explanation: `Attribute "${attr}" mismatch on "${modelName}.${fieldName}": SQLite=${sSerialized}, Postgres=${pSerialized}`
          });
        }
      };

      compareFieldAttr("type", sf.type, pf.type);
      compareFieldAttr("isRequired", sf.isRequired, pf.isRequired);
      compareFieldAttr("isList", sf.isList, pf.isList);
      compareFieldAttr("isId", sf.isId, pf.isId);
      compareFieldAttr("isUnique", sf.isUnique, pf.isUnique);
      compareFieldAttr("isUpdatedAt", sf.isUpdatedAt, pf.isUpdatedAt);
      compareFieldAttr("dbName", sf.dbName, pf.dbName);
      compareFieldAttr("default", sf.default, pf.default);
      compareFieldAttr("relationName", sf.relationName, pf.relationName);
      compareFieldAttr("relationFromFields", sf.relationFromFields, pf.relationFromFields);
      compareFieldAttr("relationToFields", sf.relationToFields, pf.relationToFields);
      compareFieldAttr("relationOnDelete", sf.relationOnDelete, pf.relationOnDelete);
      compareFieldAttr("relationOnUpdate", (sf as any).relationOnUpdate, (pf as any).relationOnUpdate);
    }

    // Check Fields: PostgreSQL -> SQLite (Detect extra fields in PostgreSQL)
    for (const [fieldName] of pFields.entries()) {
      if (!sFields.has(fieldName)) {
        mismatches.push({
          model: modelName,
          field: fieldName,
          attribute: "FIELD_EXISTENCE",
          direction: "POSTGRES_TO_SQLITE",
          sqliteValue: false,
          postgresValue: true,
          severity: "CRITICAL",
          explanation: `Field "${fieldName}" exists in PostgreSQL model "${modelName}" but missing in SQLite`
        });
      }
    }
  }

  const criticalErrors = mismatches.filter((m) => m.severity === "CRITICAL");
  return {
    isParityValid: criticalErrors.length === 0,
    mismatches
  };
}

// Execute standalone if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  verifyCompleteDmmfSchemaParity().then((res) => {
    if (res.isParityValid) {
      console.log("SUCCESS: 100% structural DMMF parity verified between SQLite and PostgreSQL schemas.");
      process.exit(0);
    } else {
      console.error("FAILURE: Schema parity violations detected:\n", JSON.stringify(res.mismatches, null, 2));
      process.exit(1);
    }
  });
}

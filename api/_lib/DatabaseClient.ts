/**
 * DatabaseClient interface — defines the contract for database operations.
 * Any database implementation (Supabase, mock, test double) must satisfy this.
 */
export interface DatabaseClient {
  from(table: string): QueryBuilder;
  auth: AuthClient;
}

export interface QueryBuilder extends PromiseLike<QueryResult> {
  select(columns?: string): QueryBuilder;
  eq(column: string, value: unknown): QueryBuilder;
  maybeSingle(): Promise<QueryResult>;
  single(): Promise<QueryResult>;
  insert(data: unknown): Promise<QueryResult>;
  update(data: unknown): Promise<QueryResult>;
  delete(): Promise<QueryResult>;
}

export interface AuthClient {
  getUser(token: string): Promise<{ data: { user: { id: string; email: string } | null }; error: AuthError | null }>;
}

export interface QueryResult {
  data: unknown | null;
  error: QueryError | null;
}

export interface QueryError {
  message: string;
  code?: string;
}

export interface AuthError {
  message: string;
}
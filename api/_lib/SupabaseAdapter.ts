/**
 * SupabaseAdapter — wraps the Supabase client to satisfy DatabaseClient.
 * Swap this for a mock in tests without changing callers.
 */
import type { DatabaseClient, QueryResult, QueryError, AuthError } from './DatabaseClient.js';

type SupabaseClient = ReturnType<typeof import('./supabase.js').supabase>;
type SupabaseQueryBuilder = ReturnType<SupabaseClient['from']>;

/** Lazy-load so env vars aren't required at module parse time */
function createSupabaseClient(): SupabaseClient {
  const { supabase } = require('./supabase.js');
  return supabase;
}

export class SupabaseAdapter implements DatabaseClient {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? createSupabaseClient();
  }

  from(table: string) {
    return new SupabaseQueryBuilderAdapter(this.client.from(table));
  }

  get auth() {
    return {
      getUser: async (token: string) => {
        const { data, error } = await this.client.auth.getUser(token);
        if (error) {
          return { data: { user: null }, error: { message: error.message } as AuthError };
        }
        return { data: { user: data.user ? { id: data.user.id, email: data.user.email ?? '' } : null }, error: null };
      },
    };
  }
}

class SupabaseQueryBuilderAdapter {
  private builder: SupabaseQueryBuilder;

  constructor(builder: SupabaseQueryBuilder) {
    this.builder = builder;
  }

  select(columns = '*') {
    this.builder.select(columns);
    return this;
  }

  eq(column: string, value: unknown) {
    this.builder.eq(column, value);
    return this;
  }

  async maybeSingle(): Promise<QueryResult> {
    const { data, error } = await (this.builder as any).maybeSingle();
    if (error) return { data: null, error: { message: error.message, code: error.code } as QueryError };
    return { data, error: null };
  }

  async single(): Promise<QueryResult> {
    const { data, error } = await this.builder.single();
    if (error) {
      return { data: null, error: { message: error.message, code: error.code } as QueryError };
    }
    return { data, error: null };
  }

  async insert(data: unknown): Promise<QueryResult> {
    const { data: result, error } = await this.builder.insert(data);
    if (error) {
      return { data: null, error: { message: error.message, code: error.code } as QueryError };
    }
    return { data: result, error: null };
  }

  async update(data: unknown): Promise<QueryResult> {
    const { data: result, error } = await this.builder.update(data);
    if (error) {
      return { data: null, error: { message: error.message, code: error.code } as QueryError };
    }
    return { data: result, error: null };
  }

  async delete(): Promise<QueryResult> {
    const { data, error } = await this.builder.delete();
    if (error) {
      return { data: null, error: { message: error.message, code: error.code } as QueryError };
    }
    return { data: null, error: null };
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return (this.builder as unknown as Promise<QueryResult>).then(onfulfilled, onrejected);
  }
}
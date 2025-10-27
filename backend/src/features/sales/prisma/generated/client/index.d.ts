
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Sale
 * 
 */
export type Sale = $Result.DefaultSelection<Prisma.$SalePayload>
/**
 * Model RkData
 * 
 */
export type RkData = $Result.DefaultSelection<Prisma.$RkDataPayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Sales
 * const sales = await prisma.sale.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Sales
   * const sales = await prisma.sale.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.sale`: Exposes CRUD operations for the **Sale** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Sales
    * const sales = await prisma.sale.findMany()
    * ```
    */
  get sale(): Prisma.SaleDelegate<ExtArgs>;

  /**
   * `prisma.rkData`: Exposes CRUD operations for the **RkData** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RkData
    * const rkData = await prisma.rkData.findMany()
    * ```
    */
  get rkData(): Prisma.RkDataDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Sale: 'Sale',
    RkData: 'RkData'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "sale" | "rkData"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Sale: {
        payload: Prisma.$SalePayload<ExtArgs>
        fields: Prisma.SaleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SaleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SalePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SaleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SalePayload>
          }
          findFirst: {
            args: Prisma.SaleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SalePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SaleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SalePayload>
          }
          findMany: {
            args: Prisma.SaleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SalePayload>[]
          }
          create: {
            args: Prisma.SaleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SalePayload>
          }
          createMany: {
            args: Prisma.SaleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SaleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SalePayload>[]
          }
          delete: {
            args: Prisma.SaleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SalePayload>
          }
          update: {
            args: Prisma.SaleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SalePayload>
          }
          deleteMany: {
            args: Prisma.SaleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SaleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SaleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SalePayload>
          }
          aggregate: {
            args: Prisma.SaleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSale>
          }
          groupBy: {
            args: Prisma.SaleGroupByArgs<ExtArgs>
            result: $Utils.Optional<SaleGroupByOutputType>[]
          }
          count: {
            args: Prisma.SaleCountArgs<ExtArgs>
            result: $Utils.Optional<SaleCountAggregateOutputType> | number
          }
        }
      }
      RkData: {
        payload: Prisma.$RkDataPayload<ExtArgs>
        fields: Prisma.RkDataFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RkDataFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RkDataPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RkDataFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RkDataPayload>
          }
          findFirst: {
            args: Prisma.RkDataFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RkDataPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RkDataFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RkDataPayload>
          }
          findMany: {
            args: Prisma.RkDataFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RkDataPayload>[]
          }
          create: {
            args: Prisma.RkDataCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RkDataPayload>
          }
          createMany: {
            args: Prisma.RkDataCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RkDataCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RkDataPayload>[]
          }
          delete: {
            args: Prisma.RkDataDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RkDataPayload>
          }
          update: {
            args: Prisma.RkDataUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RkDataPayload>
          }
          deleteMany: {
            args: Prisma.RkDataDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RkDataUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.RkDataUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RkDataPayload>
          }
          aggregate: {
            args: Prisma.RkDataAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRkData>
          }
          groupBy: {
            args: Prisma.RkDataGroupByArgs<ExtArgs>
            result: $Utils.Optional<RkDataGroupByOutputType>[]
          }
          count: {
            args: Prisma.RkDataCountArgs<ExtArgs>
            result: $Utils.Optional<RkDataCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model Sale
   */

  export type AggregateSale = {
    _count: SaleCountAggregateOutputType | null
    _avg: SaleAvgAggregateOutputType | null
    _sum: SaleSumAggregateOutputType | null
    _min: SaleMinAggregateOutputType | null
    _max: SaleMaxAggregateOutputType | null
  }

  export type SaleAvgAggregateOutputType = {
    id: number | null
    amount: Decimal | null
    qty: number | null
    rate: Decimal | null
  }

  export type SaleSumAggregateOutputType = {
    id: bigint | null
    amount: Decimal | null
    qty: number | null
    rate: Decimal | null
  }

  export type SaleMinAggregateOutputType = {
    id: bigint | null
    source: string | null
    orderNo: string | null
    isbn: string | null
    title: string | null
    author: string | null
    publisher: string | null
    customerName: string | null
    mobile: string | null
    paymentMode: string | null
    amount: Decimal | null
    qty: number | null
    rate: Decimal | null
    date: Date | null
    rowHash: string | null
    createdAt: Date | null
  }

  export type SaleMaxAggregateOutputType = {
    id: bigint | null
    source: string | null
    orderNo: string | null
    isbn: string | null
    title: string | null
    author: string | null
    publisher: string | null
    customerName: string | null
    mobile: string | null
    paymentMode: string | null
    amount: Decimal | null
    qty: number | null
    rate: Decimal | null
    date: Date | null
    rowHash: string | null
    createdAt: Date | null
  }

  export type SaleCountAggregateOutputType = {
    id: number
    source: number
    orderNo: number
    isbn: number
    title: number
    author: number
    publisher: number
    customerName: number
    mobile: number
    paymentMode: number
    amount: number
    qty: number
    rate: number
    date: number
    rawJson: number
    rowHash: number
    createdAt: number
    _all: number
  }


  export type SaleAvgAggregateInputType = {
    id?: true
    amount?: true
    qty?: true
    rate?: true
  }

  export type SaleSumAggregateInputType = {
    id?: true
    amount?: true
    qty?: true
    rate?: true
  }

  export type SaleMinAggregateInputType = {
    id?: true
    source?: true
    orderNo?: true
    isbn?: true
    title?: true
    author?: true
    publisher?: true
    customerName?: true
    mobile?: true
    paymentMode?: true
    amount?: true
    qty?: true
    rate?: true
    date?: true
    rowHash?: true
    createdAt?: true
  }

  export type SaleMaxAggregateInputType = {
    id?: true
    source?: true
    orderNo?: true
    isbn?: true
    title?: true
    author?: true
    publisher?: true
    customerName?: true
    mobile?: true
    paymentMode?: true
    amount?: true
    qty?: true
    rate?: true
    date?: true
    rowHash?: true
    createdAt?: true
  }

  export type SaleCountAggregateInputType = {
    id?: true
    source?: true
    orderNo?: true
    isbn?: true
    title?: true
    author?: true
    publisher?: true
    customerName?: true
    mobile?: true
    paymentMode?: true
    amount?: true
    qty?: true
    rate?: true
    date?: true
    rawJson?: true
    rowHash?: true
    createdAt?: true
    _all?: true
  }

  export type SaleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Sale to aggregate.
     */
    where?: SaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sales to fetch.
     */
    orderBy?: SaleOrderByWithRelationInput | SaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Sales
    **/
    _count?: true | SaleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SaleAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SaleSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SaleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SaleMaxAggregateInputType
  }

  export type GetSaleAggregateType<T extends SaleAggregateArgs> = {
        [P in keyof T & keyof AggregateSale]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSale[P]>
      : GetScalarType<T[P], AggregateSale[P]>
  }




  export type SaleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SaleWhereInput
    orderBy?: SaleOrderByWithAggregationInput | SaleOrderByWithAggregationInput[]
    by: SaleScalarFieldEnum[] | SaleScalarFieldEnum
    having?: SaleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SaleCountAggregateInputType | true
    _avg?: SaleAvgAggregateInputType
    _sum?: SaleSumAggregateInputType
    _min?: SaleMinAggregateInputType
    _max?: SaleMaxAggregateInputType
  }

  export type SaleGroupByOutputType = {
    id: bigint
    source: string
    orderNo: string | null
    isbn: string | null
    title: string | null
    author: string | null
    publisher: string | null
    customerName: string | null
    mobile: string | null
    paymentMode: string | null
    amount: Decimal | null
    qty: number | null
    rate: Decimal | null
    date: Date | null
    rawJson: JsonValue
    rowHash: string | null
    createdAt: Date
    _count: SaleCountAggregateOutputType | null
    _avg: SaleAvgAggregateOutputType | null
    _sum: SaleSumAggregateOutputType | null
    _min: SaleMinAggregateOutputType | null
    _max: SaleMaxAggregateOutputType | null
  }

  type GetSaleGroupByPayload<T extends SaleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SaleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SaleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SaleGroupByOutputType[P]>
            : GetScalarType<T[P], SaleGroupByOutputType[P]>
        }
      >
    >


  export type SaleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    source?: boolean
    orderNo?: boolean
    isbn?: boolean
    title?: boolean
    author?: boolean
    publisher?: boolean
    customerName?: boolean
    mobile?: boolean
    paymentMode?: boolean
    amount?: boolean
    qty?: boolean
    rate?: boolean
    date?: boolean
    rawJson?: boolean
    rowHash?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["sale"]>

  export type SaleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    source?: boolean
    orderNo?: boolean
    isbn?: boolean
    title?: boolean
    author?: boolean
    publisher?: boolean
    customerName?: boolean
    mobile?: boolean
    paymentMode?: boolean
    amount?: boolean
    qty?: boolean
    rate?: boolean
    date?: boolean
    rawJson?: boolean
    rowHash?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["sale"]>

  export type SaleSelectScalar = {
    id?: boolean
    source?: boolean
    orderNo?: boolean
    isbn?: boolean
    title?: boolean
    author?: boolean
    publisher?: boolean
    customerName?: boolean
    mobile?: boolean
    paymentMode?: boolean
    amount?: boolean
    qty?: boolean
    rate?: boolean
    date?: boolean
    rawJson?: boolean
    rowHash?: boolean
    createdAt?: boolean
  }


  export type $SalePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Sale"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      source: string
      orderNo: string | null
      isbn: string | null
      title: string | null
      author: string | null
      publisher: string | null
      customerName: string | null
      mobile: string | null
      paymentMode: string | null
      amount: Prisma.Decimal | null
      qty: number | null
      rate: Prisma.Decimal | null
      date: Date | null
      rawJson: Prisma.JsonValue
      rowHash: string | null
      createdAt: Date
    }, ExtArgs["result"]["sale"]>
    composites: {}
  }

  type SaleGetPayload<S extends boolean | null | undefined | SaleDefaultArgs> = $Result.GetResult<Prisma.$SalePayload, S>

  type SaleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<SaleFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: SaleCountAggregateInputType | true
    }

  export interface SaleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Sale'], meta: { name: 'Sale' } }
    /**
     * Find zero or one Sale that matches the filter.
     * @param {SaleFindUniqueArgs} args - Arguments to find a Sale
     * @example
     * // Get one Sale
     * const sale = await prisma.sale.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SaleFindUniqueArgs>(args: SelectSubset<T, SaleFindUniqueArgs<ExtArgs>>): Prisma__SaleClient<$Result.GetResult<Prisma.$SalePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Sale that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {SaleFindUniqueOrThrowArgs} args - Arguments to find a Sale
     * @example
     * // Get one Sale
     * const sale = await prisma.sale.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SaleFindUniqueOrThrowArgs>(args: SelectSubset<T, SaleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SaleClient<$Result.GetResult<Prisma.$SalePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Sale that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SaleFindFirstArgs} args - Arguments to find a Sale
     * @example
     * // Get one Sale
     * const sale = await prisma.sale.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SaleFindFirstArgs>(args?: SelectSubset<T, SaleFindFirstArgs<ExtArgs>>): Prisma__SaleClient<$Result.GetResult<Prisma.$SalePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Sale that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SaleFindFirstOrThrowArgs} args - Arguments to find a Sale
     * @example
     * // Get one Sale
     * const sale = await prisma.sale.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SaleFindFirstOrThrowArgs>(args?: SelectSubset<T, SaleFindFirstOrThrowArgs<ExtArgs>>): Prisma__SaleClient<$Result.GetResult<Prisma.$SalePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Sales that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SaleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Sales
     * const sales = await prisma.sale.findMany()
     * 
     * // Get first 10 Sales
     * const sales = await prisma.sale.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const saleWithIdOnly = await prisma.sale.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SaleFindManyArgs>(args?: SelectSubset<T, SaleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SalePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Sale.
     * @param {SaleCreateArgs} args - Arguments to create a Sale.
     * @example
     * // Create one Sale
     * const Sale = await prisma.sale.create({
     *   data: {
     *     // ... data to create a Sale
     *   }
     * })
     * 
     */
    create<T extends SaleCreateArgs>(args: SelectSubset<T, SaleCreateArgs<ExtArgs>>): Prisma__SaleClient<$Result.GetResult<Prisma.$SalePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Sales.
     * @param {SaleCreateManyArgs} args - Arguments to create many Sales.
     * @example
     * // Create many Sales
     * const sale = await prisma.sale.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SaleCreateManyArgs>(args?: SelectSubset<T, SaleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Sales and returns the data saved in the database.
     * @param {SaleCreateManyAndReturnArgs} args - Arguments to create many Sales.
     * @example
     * // Create many Sales
     * const sale = await prisma.sale.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Sales and only return the `id`
     * const saleWithIdOnly = await prisma.sale.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SaleCreateManyAndReturnArgs>(args?: SelectSubset<T, SaleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SalePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Sale.
     * @param {SaleDeleteArgs} args - Arguments to delete one Sale.
     * @example
     * // Delete one Sale
     * const Sale = await prisma.sale.delete({
     *   where: {
     *     // ... filter to delete one Sale
     *   }
     * })
     * 
     */
    delete<T extends SaleDeleteArgs>(args: SelectSubset<T, SaleDeleteArgs<ExtArgs>>): Prisma__SaleClient<$Result.GetResult<Prisma.$SalePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Sale.
     * @param {SaleUpdateArgs} args - Arguments to update one Sale.
     * @example
     * // Update one Sale
     * const sale = await prisma.sale.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SaleUpdateArgs>(args: SelectSubset<T, SaleUpdateArgs<ExtArgs>>): Prisma__SaleClient<$Result.GetResult<Prisma.$SalePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Sales.
     * @param {SaleDeleteManyArgs} args - Arguments to filter Sales to delete.
     * @example
     * // Delete a few Sales
     * const { count } = await prisma.sale.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SaleDeleteManyArgs>(args?: SelectSubset<T, SaleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sales.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SaleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Sales
     * const sale = await prisma.sale.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SaleUpdateManyArgs>(args: SelectSubset<T, SaleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Sale.
     * @param {SaleUpsertArgs} args - Arguments to update or create a Sale.
     * @example
     * // Update or create a Sale
     * const sale = await prisma.sale.upsert({
     *   create: {
     *     // ... data to create a Sale
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Sale we want to update
     *   }
     * })
     */
    upsert<T extends SaleUpsertArgs>(args: SelectSubset<T, SaleUpsertArgs<ExtArgs>>): Prisma__SaleClient<$Result.GetResult<Prisma.$SalePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Sales.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SaleCountArgs} args - Arguments to filter Sales to count.
     * @example
     * // Count the number of Sales
     * const count = await prisma.sale.count({
     *   where: {
     *     // ... the filter for the Sales we want to count
     *   }
     * })
    **/
    count<T extends SaleCountArgs>(
      args?: Subset<T, SaleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SaleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Sale.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SaleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SaleAggregateArgs>(args: Subset<T, SaleAggregateArgs>): Prisma.PrismaPromise<GetSaleAggregateType<T>>

    /**
     * Group by Sale.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SaleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SaleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SaleGroupByArgs['orderBy'] }
        : { orderBy?: SaleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SaleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSaleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Sale model
   */
  readonly fields: SaleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Sale.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SaleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Sale model
   */ 
  interface SaleFieldRefs {
    readonly id: FieldRef<"Sale", 'BigInt'>
    readonly source: FieldRef<"Sale", 'String'>
    readonly orderNo: FieldRef<"Sale", 'String'>
    readonly isbn: FieldRef<"Sale", 'String'>
    readonly title: FieldRef<"Sale", 'String'>
    readonly author: FieldRef<"Sale", 'String'>
    readonly publisher: FieldRef<"Sale", 'String'>
    readonly customerName: FieldRef<"Sale", 'String'>
    readonly mobile: FieldRef<"Sale", 'String'>
    readonly paymentMode: FieldRef<"Sale", 'String'>
    readonly amount: FieldRef<"Sale", 'Decimal'>
    readonly qty: FieldRef<"Sale", 'Int'>
    readonly rate: FieldRef<"Sale", 'Decimal'>
    readonly date: FieldRef<"Sale", 'DateTime'>
    readonly rawJson: FieldRef<"Sale", 'Json'>
    readonly rowHash: FieldRef<"Sale", 'String'>
    readonly createdAt: FieldRef<"Sale", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Sale findUnique
   */
  export type SaleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Sale
     */
    select?: SaleSelect<ExtArgs> | null
    /**
     * Filter, which Sale to fetch.
     */
    where: SaleWhereUniqueInput
  }

  /**
   * Sale findUniqueOrThrow
   */
  export type SaleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Sale
     */
    select?: SaleSelect<ExtArgs> | null
    /**
     * Filter, which Sale to fetch.
     */
    where: SaleWhereUniqueInput
  }

  /**
   * Sale findFirst
   */
  export type SaleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Sale
     */
    select?: SaleSelect<ExtArgs> | null
    /**
     * Filter, which Sale to fetch.
     */
    where?: SaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sales to fetch.
     */
    orderBy?: SaleOrderByWithRelationInput | SaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sales.
     */
    cursor?: SaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sales.
     */
    distinct?: SaleScalarFieldEnum | SaleScalarFieldEnum[]
  }

  /**
   * Sale findFirstOrThrow
   */
  export type SaleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Sale
     */
    select?: SaleSelect<ExtArgs> | null
    /**
     * Filter, which Sale to fetch.
     */
    where?: SaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sales to fetch.
     */
    orderBy?: SaleOrderByWithRelationInput | SaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sales.
     */
    cursor?: SaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sales.
     */
    distinct?: SaleScalarFieldEnum | SaleScalarFieldEnum[]
  }

  /**
   * Sale findMany
   */
  export type SaleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Sale
     */
    select?: SaleSelect<ExtArgs> | null
    /**
     * Filter, which Sales to fetch.
     */
    where?: SaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sales to fetch.
     */
    orderBy?: SaleOrderByWithRelationInput | SaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Sales.
     */
    cursor?: SaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sales.
     */
    skip?: number
    distinct?: SaleScalarFieldEnum | SaleScalarFieldEnum[]
  }

  /**
   * Sale create
   */
  export type SaleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Sale
     */
    select?: SaleSelect<ExtArgs> | null
    /**
     * The data needed to create a Sale.
     */
    data: XOR<SaleCreateInput, SaleUncheckedCreateInput>
  }

  /**
   * Sale createMany
   */
  export type SaleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Sales.
     */
    data: SaleCreateManyInput | SaleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Sale createManyAndReturn
   */
  export type SaleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Sale
     */
    select?: SaleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Sales.
     */
    data: SaleCreateManyInput | SaleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Sale update
   */
  export type SaleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Sale
     */
    select?: SaleSelect<ExtArgs> | null
    /**
     * The data needed to update a Sale.
     */
    data: XOR<SaleUpdateInput, SaleUncheckedUpdateInput>
    /**
     * Choose, which Sale to update.
     */
    where: SaleWhereUniqueInput
  }

  /**
   * Sale updateMany
   */
  export type SaleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Sales.
     */
    data: XOR<SaleUpdateManyMutationInput, SaleUncheckedUpdateManyInput>
    /**
     * Filter which Sales to update
     */
    where?: SaleWhereInput
  }

  /**
   * Sale upsert
   */
  export type SaleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Sale
     */
    select?: SaleSelect<ExtArgs> | null
    /**
     * The filter to search for the Sale to update in case it exists.
     */
    where: SaleWhereUniqueInput
    /**
     * In case the Sale found by the `where` argument doesn't exist, create a new Sale with this data.
     */
    create: XOR<SaleCreateInput, SaleUncheckedCreateInput>
    /**
     * In case the Sale was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SaleUpdateInput, SaleUncheckedUpdateInput>
  }

  /**
   * Sale delete
   */
  export type SaleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Sale
     */
    select?: SaleSelect<ExtArgs> | null
    /**
     * Filter which Sale to delete.
     */
    where: SaleWhereUniqueInput
  }

  /**
   * Sale deleteMany
   */
  export type SaleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Sales to delete
     */
    where?: SaleWhereInput
  }

  /**
   * Sale without action
   */
  export type SaleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Sale
     */
    select?: SaleSelect<ExtArgs> | null
  }


  /**
   * Model RkData
   */

  export type AggregateRkData = {
    _count: RkDataCountAggregateOutputType | null
    _avg: RkDataAvgAggregateOutputType | null
    _sum: RkDataSumAggregateOutputType | null
    _min: RkDataMinAggregateOutputType | null
    _max: RkDataMaxAggregateOutputType | null
  }

  export type RkDataAvgAggregateOutputType = {
    id: number | null
    slNo: number | null
    noOfPages: number | null
    mrp: Decimal | null
    sellingPrice: Decimal | null
  }

  export type RkDataSumAggregateOutputType = {
    id: bigint | null
    slNo: number | null
    noOfPages: number | null
    mrp: Decimal | null
    sellingPrice: Decimal | null
  }

  export type RkDataMinAggregateOutputType = {
    id: bigint | null
    slNo: number | null
    date: Date | null
    orderId: string | null
    orderStatus: string | null
    isbn: string | null
    title: string | null
    author: string | null
    category: string | null
    publicationName: string | null
    releaseDate: Date | null
    noOfPages: number | null
    name: string | null
    pincode: string | null
    gender: string | null
    ageGroup: string | null
    mobile: string | null
    email: string | null
    membershipId: string | null
    paymentMode: string | null
    mrp: Decimal | null
    sellingPrice: Decimal | null
    discountCouponCode: string | null
    rowHash: string | null
    createdAt: Date | null
  }

  export type RkDataMaxAggregateOutputType = {
    id: bigint | null
    slNo: number | null
    date: Date | null
    orderId: string | null
    orderStatus: string | null
    isbn: string | null
    title: string | null
    author: string | null
    category: string | null
    publicationName: string | null
    releaseDate: Date | null
    noOfPages: number | null
    name: string | null
    pincode: string | null
    gender: string | null
    ageGroup: string | null
    mobile: string | null
    email: string | null
    membershipId: string | null
    paymentMode: string | null
    mrp: Decimal | null
    sellingPrice: Decimal | null
    discountCouponCode: string | null
    rowHash: string | null
    createdAt: Date | null
  }

  export type RkDataCountAggregateOutputType = {
    id: number
    slNo: number
    date: number
    orderId: number
    orderStatus: number
    isbn: number
    title: number
    author: number
    category: number
    publicationName: number
    releaseDate: number
    noOfPages: number
    name: number
    pincode: number
    gender: number
    ageGroup: number
    mobile: number
    email: number
    membershipId: number
    paymentMode: number
    mrp: number
    sellingPrice: number
    discountCouponCode: number
    rawJson: number
    rowHash: number
    createdAt: number
    _all: number
  }


  export type RkDataAvgAggregateInputType = {
    id?: true
    slNo?: true
    noOfPages?: true
    mrp?: true
    sellingPrice?: true
  }

  export type RkDataSumAggregateInputType = {
    id?: true
    slNo?: true
    noOfPages?: true
    mrp?: true
    sellingPrice?: true
  }

  export type RkDataMinAggregateInputType = {
    id?: true
    slNo?: true
    date?: true
    orderId?: true
    orderStatus?: true
    isbn?: true
    title?: true
    author?: true
    category?: true
    publicationName?: true
    releaseDate?: true
    noOfPages?: true
    name?: true
    pincode?: true
    gender?: true
    ageGroup?: true
    mobile?: true
    email?: true
    membershipId?: true
    paymentMode?: true
    mrp?: true
    sellingPrice?: true
    discountCouponCode?: true
    rowHash?: true
    createdAt?: true
  }

  export type RkDataMaxAggregateInputType = {
    id?: true
    slNo?: true
    date?: true
    orderId?: true
    orderStatus?: true
    isbn?: true
    title?: true
    author?: true
    category?: true
    publicationName?: true
    releaseDate?: true
    noOfPages?: true
    name?: true
    pincode?: true
    gender?: true
    ageGroup?: true
    mobile?: true
    email?: true
    membershipId?: true
    paymentMode?: true
    mrp?: true
    sellingPrice?: true
    discountCouponCode?: true
    rowHash?: true
    createdAt?: true
  }

  export type RkDataCountAggregateInputType = {
    id?: true
    slNo?: true
    date?: true
    orderId?: true
    orderStatus?: true
    isbn?: true
    title?: true
    author?: true
    category?: true
    publicationName?: true
    releaseDate?: true
    noOfPages?: true
    name?: true
    pincode?: true
    gender?: true
    ageGroup?: true
    mobile?: true
    email?: true
    membershipId?: true
    paymentMode?: true
    mrp?: true
    sellingPrice?: true
    discountCouponCode?: true
    rawJson?: true
    rowHash?: true
    createdAt?: true
    _all?: true
  }

  export type RkDataAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RkData to aggregate.
     */
    where?: RkDataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RkData to fetch.
     */
    orderBy?: RkDataOrderByWithRelationInput | RkDataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RkDataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RkData from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RkData.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RkData
    **/
    _count?: true | RkDataCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RkDataAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RkDataSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RkDataMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RkDataMaxAggregateInputType
  }

  export type GetRkDataAggregateType<T extends RkDataAggregateArgs> = {
        [P in keyof T & keyof AggregateRkData]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRkData[P]>
      : GetScalarType<T[P], AggregateRkData[P]>
  }




  export type RkDataGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RkDataWhereInput
    orderBy?: RkDataOrderByWithAggregationInput | RkDataOrderByWithAggregationInput[]
    by: RkDataScalarFieldEnum[] | RkDataScalarFieldEnum
    having?: RkDataScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RkDataCountAggregateInputType | true
    _avg?: RkDataAvgAggregateInputType
    _sum?: RkDataSumAggregateInputType
    _min?: RkDataMinAggregateInputType
    _max?: RkDataMaxAggregateInputType
  }

  export type RkDataGroupByOutputType = {
    id: bigint
    slNo: number | null
    date: Date | null
    orderId: string | null
    orderStatus: string | null
    isbn: string | null
    title: string | null
    author: string | null
    category: string | null
    publicationName: string | null
    releaseDate: Date | null
    noOfPages: number | null
    name: string | null
    pincode: string | null
    gender: string | null
    ageGroup: string | null
    mobile: string | null
    email: string | null
    membershipId: string | null
    paymentMode: string | null
    mrp: Decimal | null
    sellingPrice: Decimal | null
    discountCouponCode: string | null
    rawJson: JsonValue
    rowHash: string | null
    createdAt: Date
    _count: RkDataCountAggregateOutputType | null
    _avg: RkDataAvgAggregateOutputType | null
    _sum: RkDataSumAggregateOutputType | null
    _min: RkDataMinAggregateOutputType | null
    _max: RkDataMaxAggregateOutputType | null
  }

  type GetRkDataGroupByPayload<T extends RkDataGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RkDataGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RkDataGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RkDataGroupByOutputType[P]>
            : GetScalarType<T[P], RkDataGroupByOutputType[P]>
        }
      >
    >


  export type RkDataSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slNo?: boolean
    date?: boolean
    orderId?: boolean
    orderStatus?: boolean
    isbn?: boolean
    title?: boolean
    author?: boolean
    category?: boolean
    publicationName?: boolean
    releaseDate?: boolean
    noOfPages?: boolean
    name?: boolean
    pincode?: boolean
    gender?: boolean
    ageGroup?: boolean
    mobile?: boolean
    email?: boolean
    membershipId?: boolean
    paymentMode?: boolean
    mrp?: boolean
    sellingPrice?: boolean
    discountCouponCode?: boolean
    rawJson?: boolean
    rowHash?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["rkData"]>

  export type RkDataSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slNo?: boolean
    date?: boolean
    orderId?: boolean
    orderStatus?: boolean
    isbn?: boolean
    title?: boolean
    author?: boolean
    category?: boolean
    publicationName?: boolean
    releaseDate?: boolean
    noOfPages?: boolean
    name?: boolean
    pincode?: boolean
    gender?: boolean
    ageGroup?: boolean
    mobile?: boolean
    email?: boolean
    membershipId?: boolean
    paymentMode?: boolean
    mrp?: boolean
    sellingPrice?: boolean
    discountCouponCode?: boolean
    rawJson?: boolean
    rowHash?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["rkData"]>

  export type RkDataSelectScalar = {
    id?: boolean
    slNo?: boolean
    date?: boolean
    orderId?: boolean
    orderStatus?: boolean
    isbn?: boolean
    title?: boolean
    author?: boolean
    category?: boolean
    publicationName?: boolean
    releaseDate?: boolean
    noOfPages?: boolean
    name?: boolean
    pincode?: boolean
    gender?: boolean
    ageGroup?: boolean
    mobile?: boolean
    email?: boolean
    membershipId?: boolean
    paymentMode?: boolean
    mrp?: boolean
    sellingPrice?: boolean
    discountCouponCode?: boolean
    rawJson?: boolean
    rowHash?: boolean
    createdAt?: boolean
  }


  export type $RkDataPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RkData"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      slNo: number | null
      date: Date | null
      orderId: string | null
      orderStatus: string | null
      isbn: string | null
      title: string | null
      author: string | null
      category: string | null
      publicationName: string | null
      releaseDate: Date | null
      noOfPages: number | null
      name: string | null
      pincode: string | null
      gender: string | null
      ageGroup: string | null
      mobile: string | null
      email: string | null
      membershipId: string | null
      paymentMode: string | null
      mrp: Prisma.Decimal | null
      sellingPrice: Prisma.Decimal | null
      discountCouponCode: string | null
      rawJson: Prisma.JsonValue
      rowHash: string | null
      createdAt: Date
    }, ExtArgs["result"]["rkData"]>
    composites: {}
  }

  type RkDataGetPayload<S extends boolean | null | undefined | RkDataDefaultArgs> = $Result.GetResult<Prisma.$RkDataPayload, S>

  type RkDataCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<RkDataFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: RkDataCountAggregateInputType | true
    }

  export interface RkDataDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RkData'], meta: { name: 'RkData' } }
    /**
     * Find zero or one RkData that matches the filter.
     * @param {RkDataFindUniqueArgs} args - Arguments to find a RkData
     * @example
     * // Get one RkData
     * const rkData = await prisma.rkData.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RkDataFindUniqueArgs>(args: SelectSubset<T, RkDataFindUniqueArgs<ExtArgs>>): Prisma__RkDataClient<$Result.GetResult<Prisma.$RkDataPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one RkData that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {RkDataFindUniqueOrThrowArgs} args - Arguments to find a RkData
     * @example
     * // Get one RkData
     * const rkData = await prisma.rkData.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RkDataFindUniqueOrThrowArgs>(args: SelectSubset<T, RkDataFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RkDataClient<$Result.GetResult<Prisma.$RkDataPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first RkData that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RkDataFindFirstArgs} args - Arguments to find a RkData
     * @example
     * // Get one RkData
     * const rkData = await prisma.rkData.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RkDataFindFirstArgs>(args?: SelectSubset<T, RkDataFindFirstArgs<ExtArgs>>): Prisma__RkDataClient<$Result.GetResult<Prisma.$RkDataPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first RkData that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RkDataFindFirstOrThrowArgs} args - Arguments to find a RkData
     * @example
     * // Get one RkData
     * const rkData = await prisma.rkData.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RkDataFindFirstOrThrowArgs>(args?: SelectSubset<T, RkDataFindFirstOrThrowArgs<ExtArgs>>): Prisma__RkDataClient<$Result.GetResult<Prisma.$RkDataPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more RkData that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RkDataFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RkData
     * const rkData = await prisma.rkData.findMany()
     * 
     * // Get first 10 RkData
     * const rkData = await prisma.rkData.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const rkDataWithIdOnly = await prisma.rkData.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RkDataFindManyArgs>(args?: SelectSubset<T, RkDataFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RkDataPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a RkData.
     * @param {RkDataCreateArgs} args - Arguments to create a RkData.
     * @example
     * // Create one RkData
     * const RkData = await prisma.rkData.create({
     *   data: {
     *     // ... data to create a RkData
     *   }
     * })
     * 
     */
    create<T extends RkDataCreateArgs>(args: SelectSubset<T, RkDataCreateArgs<ExtArgs>>): Prisma__RkDataClient<$Result.GetResult<Prisma.$RkDataPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many RkData.
     * @param {RkDataCreateManyArgs} args - Arguments to create many RkData.
     * @example
     * // Create many RkData
     * const rkData = await prisma.rkData.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RkDataCreateManyArgs>(args?: SelectSubset<T, RkDataCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RkData and returns the data saved in the database.
     * @param {RkDataCreateManyAndReturnArgs} args - Arguments to create many RkData.
     * @example
     * // Create many RkData
     * const rkData = await prisma.rkData.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RkData and only return the `id`
     * const rkDataWithIdOnly = await prisma.rkData.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RkDataCreateManyAndReturnArgs>(args?: SelectSubset<T, RkDataCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RkDataPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a RkData.
     * @param {RkDataDeleteArgs} args - Arguments to delete one RkData.
     * @example
     * // Delete one RkData
     * const RkData = await prisma.rkData.delete({
     *   where: {
     *     // ... filter to delete one RkData
     *   }
     * })
     * 
     */
    delete<T extends RkDataDeleteArgs>(args: SelectSubset<T, RkDataDeleteArgs<ExtArgs>>): Prisma__RkDataClient<$Result.GetResult<Prisma.$RkDataPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one RkData.
     * @param {RkDataUpdateArgs} args - Arguments to update one RkData.
     * @example
     * // Update one RkData
     * const rkData = await prisma.rkData.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RkDataUpdateArgs>(args: SelectSubset<T, RkDataUpdateArgs<ExtArgs>>): Prisma__RkDataClient<$Result.GetResult<Prisma.$RkDataPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more RkData.
     * @param {RkDataDeleteManyArgs} args - Arguments to filter RkData to delete.
     * @example
     * // Delete a few RkData
     * const { count } = await prisma.rkData.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RkDataDeleteManyArgs>(args?: SelectSubset<T, RkDataDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RkData.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RkDataUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RkData
     * const rkData = await prisma.rkData.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RkDataUpdateManyArgs>(args: SelectSubset<T, RkDataUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one RkData.
     * @param {RkDataUpsertArgs} args - Arguments to update or create a RkData.
     * @example
     * // Update or create a RkData
     * const rkData = await prisma.rkData.upsert({
     *   create: {
     *     // ... data to create a RkData
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RkData we want to update
     *   }
     * })
     */
    upsert<T extends RkDataUpsertArgs>(args: SelectSubset<T, RkDataUpsertArgs<ExtArgs>>): Prisma__RkDataClient<$Result.GetResult<Prisma.$RkDataPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of RkData.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RkDataCountArgs} args - Arguments to filter RkData to count.
     * @example
     * // Count the number of RkData
     * const count = await prisma.rkData.count({
     *   where: {
     *     // ... the filter for the RkData we want to count
     *   }
     * })
    **/
    count<T extends RkDataCountArgs>(
      args?: Subset<T, RkDataCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RkDataCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RkData.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RkDataAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RkDataAggregateArgs>(args: Subset<T, RkDataAggregateArgs>): Prisma.PrismaPromise<GetRkDataAggregateType<T>>

    /**
     * Group by RkData.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RkDataGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RkDataGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RkDataGroupByArgs['orderBy'] }
        : { orderBy?: RkDataGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RkDataGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRkDataGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RkData model
   */
  readonly fields: RkDataFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RkData.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RkDataClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RkData model
   */ 
  interface RkDataFieldRefs {
    readonly id: FieldRef<"RkData", 'BigInt'>
    readonly slNo: FieldRef<"RkData", 'Int'>
    readonly date: FieldRef<"RkData", 'DateTime'>
    readonly orderId: FieldRef<"RkData", 'String'>
    readonly orderStatus: FieldRef<"RkData", 'String'>
    readonly isbn: FieldRef<"RkData", 'String'>
    readonly title: FieldRef<"RkData", 'String'>
    readonly author: FieldRef<"RkData", 'String'>
    readonly category: FieldRef<"RkData", 'String'>
    readonly publicationName: FieldRef<"RkData", 'String'>
    readonly releaseDate: FieldRef<"RkData", 'DateTime'>
    readonly noOfPages: FieldRef<"RkData", 'Int'>
    readonly name: FieldRef<"RkData", 'String'>
    readonly pincode: FieldRef<"RkData", 'String'>
    readonly gender: FieldRef<"RkData", 'String'>
    readonly ageGroup: FieldRef<"RkData", 'String'>
    readonly mobile: FieldRef<"RkData", 'String'>
    readonly email: FieldRef<"RkData", 'String'>
    readonly membershipId: FieldRef<"RkData", 'String'>
    readonly paymentMode: FieldRef<"RkData", 'String'>
    readonly mrp: FieldRef<"RkData", 'Decimal'>
    readonly sellingPrice: FieldRef<"RkData", 'Decimal'>
    readonly discountCouponCode: FieldRef<"RkData", 'String'>
    readonly rawJson: FieldRef<"RkData", 'Json'>
    readonly rowHash: FieldRef<"RkData", 'String'>
    readonly createdAt: FieldRef<"RkData", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RkData findUnique
   */
  export type RkDataFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RkData
     */
    select?: RkDataSelect<ExtArgs> | null
    /**
     * Filter, which RkData to fetch.
     */
    where: RkDataWhereUniqueInput
  }

  /**
   * RkData findUniqueOrThrow
   */
  export type RkDataFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RkData
     */
    select?: RkDataSelect<ExtArgs> | null
    /**
     * Filter, which RkData to fetch.
     */
    where: RkDataWhereUniqueInput
  }

  /**
   * RkData findFirst
   */
  export type RkDataFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RkData
     */
    select?: RkDataSelect<ExtArgs> | null
    /**
     * Filter, which RkData to fetch.
     */
    where?: RkDataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RkData to fetch.
     */
    orderBy?: RkDataOrderByWithRelationInput | RkDataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RkData.
     */
    cursor?: RkDataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RkData from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RkData.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RkData.
     */
    distinct?: RkDataScalarFieldEnum | RkDataScalarFieldEnum[]
  }

  /**
   * RkData findFirstOrThrow
   */
  export type RkDataFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RkData
     */
    select?: RkDataSelect<ExtArgs> | null
    /**
     * Filter, which RkData to fetch.
     */
    where?: RkDataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RkData to fetch.
     */
    orderBy?: RkDataOrderByWithRelationInput | RkDataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RkData.
     */
    cursor?: RkDataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RkData from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RkData.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RkData.
     */
    distinct?: RkDataScalarFieldEnum | RkDataScalarFieldEnum[]
  }

  /**
   * RkData findMany
   */
  export type RkDataFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RkData
     */
    select?: RkDataSelect<ExtArgs> | null
    /**
     * Filter, which RkData to fetch.
     */
    where?: RkDataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RkData to fetch.
     */
    orderBy?: RkDataOrderByWithRelationInput | RkDataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RkData.
     */
    cursor?: RkDataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RkData from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RkData.
     */
    skip?: number
    distinct?: RkDataScalarFieldEnum | RkDataScalarFieldEnum[]
  }

  /**
   * RkData create
   */
  export type RkDataCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RkData
     */
    select?: RkDataSelect<ExtArgs> | null
    /**
     * The data needed to create a RkData.
     */
    data: XOR<RkDataCreateInput, RkDataUncheckedCreateInput>
  }

  /**
   * RkData createMany
   */
  export type RkDataCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RkData.
     */
    data: RkDataCreateManyInput | RkDataCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RkData createManyAndReturn
   */
  export type RkDataCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RkData
     */
    select?: RkDataSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many RkData.
     */
    data: RkDataCreateManyInput | RkDataCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RkData update
   */
  export type RkDataUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RkData
     */
    select?: RkDataSelect<ExtArgs> | null
    /**
     * The data needed to update a RkData.
     */
    data: XOR<RkDataUpdateInput, RkDataUncheckedUpdateInput>
    /**
     * Choose, which RkData to update.
     */
    where: RkDataWhereUniqueInput
  }

  /**
   * RkData updateMany
   */
  export type RkDataUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RkData.
     */
    data: XOR<RkDataUpdateManyMutationInput, RkDataUncheckedUpdateManyInput>
    /**
     * Filter which RkData to update
     */
    where?: RkDataWhereInput
  }

  /**
   * RkData upsert
   */
  export type RkDataUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RkData
     */
    select?: RkDataSelect<ExtArgs> | null
    /**
     * The filter to search for the RkData to update in case it exists.
     */
    where: RkDataWhereUniqueInput
    /**
     * In case the RkData found by the `where` argument doesn't exist, create a new RkData with this data.
     */
    create: XOR<RkDataCreateInput, RkDataUncheckedCreateInput>
    /**
     * In case the RkData was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RkDataUpdateInput, RkDataUncheckedUpdateInput>
  }

  /**
   * RkData delete
   */
  export type RkDataDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RkData
     */
    select?: RkDataSelect<ExtArgs> | null
    /**
     * Filter which RkData to delete.
     */
    where: RkDataWhereUniqueInput
  }

  /**
   * RkData deleteMany
   */
  export type RkDataDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RkData to delete
     */
    where?: RkDataWhereInput
  }

  /**
   * RkData without action
   */
  export type RkDataDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RkData
     */
    select?: RkDataSelect<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const SaleScalarFieldEnum: {
    id: 'id',
    source: 'source',
    orderNo: 'orderNo',
    isbn: 'isbn',
    title: 'title',
    author: 'author',
    publisher: 'publisher',
    customerName: 'customerName',
    mobile: 'mobile',
    paymentMode: 'paymentMode',
    amount: 'amount',
    qty: 'qty',
    rate: 'rate',
    date: 'date',
    rawJson: 'rawJson',
    rowHash: 'rowHash',
    createdAt: 'createdAt'
  };

  export type SaleScalarFieldEnum = (typeof SaleScalarFieldEnum)[keyof typeof SaleScalarFieldEnum]


  export const RkDataScalarFieldEnum: {
    id: 'id',
    slNo: 'slNo',
    date: 'date',
    orderId: 'orderId',
    orderStatus: 'orderStatus',
    isbn: 'isbn',
    title: 'title',
    author: 'author',
    category: 'category',
    publicationName: 'publicationName',
    releaseDate: 'releaseDate',
    noOfPages: 'noOfPages',
    name: 'name',
    pincode: 'pincode',
    gender: 'gender',
    ageGroup: 'ageGroup',
    mobile: 'mobile',
    email: 'email',
    membershipId: 'membershipId',
    paymentMode: 'paymentMode',
    mrp: 'mrp',
    sellingPrice: 'sellingPrice',
    discountCouponCode: 'discountCouponCode',
    rawJson: 'rawJson',
    rowHash: 'rowHash',
    createdAt: 'createdAt'
  };

  export type RkDataScalarFieldEnum = (typeof RkDataScalarFieldEnum)[keyof typeof RkDataScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'BigInt'
   */
  export type BigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt'>
    


  /**
   * Reference to a field of type 'BigInt[]'
   */
  export type ListBigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type SaleWhereInput = {
    AND?: SaleWhereInput | SaleWhereInput[]
    OR?: SaleWhereInput[]
    NOT?: SaleWhereInput | SaleWhereInput[]
    id?: BigIntFilter<"Sale"> | bigint | number
    source?: StringFilter<"Sale"> | string
    orderNo?: StringNullableFilter<"Sale"> | string | null
    isbn?: StringNullableFilter<"Sale"> | string | null
    title?: StringNullableFilter<"Sale"> | string | null
    author?: StringNullableFilter<"Sale"> | string | null
    publisher?: StringNullableFilter<"Sale"> | string | null
    customerName?: StringNullableFilter<"Sale"> | string | null
    mobile?: StringNullableFilter<"Sale"> | string | null
    paymentMode?: StringNullableFilter<"Sale"> | string | null
    amount?: DecimalNullableFilter<"Sale"> | Decimal | DecimalJsLike | number | string | null
    qty?: IntNullableFilter<"Sale"> | number | null
    rate?: DecimalNullableFilter<"Sale"> | Decimal | DecimalJsLike | number | string | null
    date?: DateTimeNullableFilter<"Sale"> | Date | string | null
    rawJson?: JsonFilter<"Sale">
    rowHash?: StringNullableFilter<"Sale"> | string | null
    createdAt?: DateTimeFilter<"Sale"> | Date | string
  }

  export type SaleOrderByWithRelationInput = {
    id?: SortOrder
    source?: SortOrder
    orderNo?: SortOrderInput | SortOrder
    isbn?: SortOrderInput | SortOrder
    title?: SortOrderInput | SortOrder
    author?: SortOrderInput | SortOrder
    publisher?: SortOrderInput | SortOrder
    customerName?: SortOrderInput | SortOrder
    mobile?: SortOrderInput | SortOrder
    paymentMode?: SortOrderInput | SortOrder
    amount?: SortOrderInput | SortOrder
    qty?: SortOrderInput | SortOrder
    rate?: SortOrderInput | SortOrder
    date?: SortOrderInput | SortOrder
    rawJson?: SortOrder
    rowHash?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type SaleWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    rowHash?: string
    AND?: SaleWhereInput | SaleWhereInput[]
    OR?: SaleWhereInput[]
    NOT?: SaleWhereInput | SaleWhereInput[]
    source?: StringFilter<"Sale"> | string
    orderNo?: StringNullableFilter<"Sale"> | string | null
    isbn?: StringNullableFilter<"Sale"> | string | null
    title?: StringNullableFilter<"Sale"> | string | null
    author?: StringNullableFilter<"Sale"> | string | null
    publisher?: StringNullableFilter<"Sale"> | string | null
    customerName?: StringNullableFilter<"Sale"> | string | null
    mobile?: StringNullableFilter<"Sale"> | string | null
    paymentMode?: StringNullableFilter<"Sale"> | string | null
    amount?: DecimalNullableFilter<"Sale"> | Decimal | DecimalJsLike | number | string | null
    qty?: IntNullableFilter<"Sale"> | number | null
    rate?: DecimalNullableFilter<"Sale"> | Decimal | DecimalJsLike | number | string | null
    date?: DateTimeNullableFilter<"Sale"> | Date | string | null
    rawJson?: JsonFilter<"Sale">
    createdAt?: DateTimeFilter<"Sale"> | Date | string
  }, "id" | "rowHash">

  export type SaleOrderByWithAggregationInput = {
    id?: SortOrder
    source?: SortOrder
    orderNo?: SortOrderInput | SortOrder
    isbn?: SortOrderInput | SortOrder
    title?: SortOrderInput | SortOrder
    author?: SortOrderInput | SortOrder
    publisher?: SortOrderInput | SortOrder
    customerName?: SortOrderInput | SortOrder
    mobile?: SortOrderInput | SortOrder
    paymentMode?: SortOrderInput | SortOrder
    amount?: SortOrderInput | SortOrder
    qty?: SortOrderInput | SortOrder
    rate?: SortOrderInput | SortOrder
    date?: SortOrderInput | SortOrder
    rawJson?: SortOrder
    rowHash?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: SaleCountOrderByAggregateInput
    _avg?: SaleAvgOrderByAggregateInput
    _max?: SaleMaxOrderByAggregateInput
    _min?: SaleMinOrderByAggregateInput
    _sum?: SaleSumOrderByAggregateInput
  }

  export type SaleScalarWhereWithAggregatesInput = {
    AND?: SaleScalarWhereWithAggregatesInput | SaleScalarWhereWithAggregatesInput[]
    OR?: SaleScalarWhereWithAggregatesInput[]
    NOT?: SaleScalarWhereWithAggregatesInput | SaleScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"Sale"> | bigint | number
    source?: StringWithAggregatesFilter<"Sale"> | string
    orderNo?: StringNullableWithAggregatesFilter<"Sale"> | string | null
    isbn?: StringNullableWithAggregatesFilter<"Sale"> | string | null
    title?: StringNullableWithAggregatesFilter<"Sale"> | string | null
    author?: StringNullableWithAggregatesFilter<"Sale"> | string | null
    publisher?: StringNullableWithAggregatesFilter<"Sale"> | string | null
    customerName?: StringNullableWithAggregatesFilter<"Sale"> | string | null
    mobile?: StringNullableWithAggregatesFilter<"Sale"> | string | null
    paymentMode?: StringNullableWithAggregatesFilter<"Sale"> | string | null
    amount?: DecimalNullableWithAggregatesFilter<"Sale"> | Decimal | DecimalJsLike | number | string | null
    qty?: IntNullableWithAggregatesFilter<"Sale"> | number | null
    rate?: DecimalNullableWithAggregatesFilter<"Sale"> | Decimal | DecimalJsLike | number | string | null
    date?: DateTimeNullableWithAggregatesFilter<"Sale"> | Date | string | null
    rawJson?: JsonWithAggregatesFilter<"Sale">
    rowHash?: StringNullableWithAggregatesFilter<"Sale"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Sale"> | Date | string
  }

  export type RkDataWhereInput = {
    AND?: RkDataWhereInput | RkDataWhereInput[]
    OR?: RkDataWhereInput[]
    NOT?: RkDataWhereInput | RkDataWhereInput[]
    id?: BigIntFilter<"RkData"> | bigint | number
    slNo?: IntNullableFilter<"RkData"> | number | null
    date?: DateTimeNullableFilter<"RkData"> | Date | string | null
    orderId?: StringNullableFilter<"RkData"> | string | null
    orderStatus?: StringNullableFilter<"RkData"> | string | null
    isbn?: StringNullableFilter<"RkData"> | string | null
    title?: StringNullableFilter<"RkData"> | string | null
    author?: StringNullableFilter<"RkData"> | string | null
    category?: StringNullableFilter<"RkData"> | string | null
    publicationName?: StringNullableFilter<"RkData"> | string | null
    releaseDate?: DateTimeNullableFilter<"RkData"> | Date | string | null
    noOfPages?: IntNullableFilter<"RkData"> | number | null
    name?: StringNullableFilter<"RkData"> | string | null
    pincode?: StringNullableFilter<"RkData"> | string | null
    gender?: StringNullableFilter<"RkData"> | string | null
    ageGroup?: StringNullableFilter<"RkData"> | string | null
    mobile?: StringNullableFilter<"RkData"> | string | null
    email?: StringNullableFilter<"RkData"> | string | null
    membershipId?: StringNullableFilter<"RkData"> | string | null
    paymentMode?: StringNullableFilter<"RkData"> | string | null
    mrp?: DecimalNullableFilter<"RkData"> | Decimal | DecimalJsLike | number | string | null
    sellingPrice?: DecimalNullableFilter<"RkData"> | Decimal | DecimalJsLike | number | string | null
    discountCouponCode?: StringNullableFilter<"RkData"> | string | null
    rawJson?: JsonFilter<"RkData">
    rowHash?: StringNullableFilter<"RkData"> | string | null
    createdAt?: DateTimeFilter<"RkData"> | Date | string
  }

  export type RkDataOrderByWithRelationInput = {
    id?: SortOrder
    slNo?: SortOrderInput | SortOrder
    date?: SortOrderInput | SortOrder
    orderId?: SortOrderInput | SortOrder
    orderStatus?: SortOrderInput | SortOrder
    isbn?: SortOrderInput | SortOrder
    title?: SortOrderInput | SortOrder
    author?: SortOrderInput | SortOrder
    category?: SortOrderInput | SortOrder
    publicationName?: SortOrderInput | SortOrder
    releaseDate?: SortOrderInput | SortOrder
    noOfPages?: SortOrderInput | SortOrder
    name?: SortOrderInput | SortOrder
    pincode?: SortOrderInput | SortOrder
    gender?: SortOrderInput | SortOrder
    ageGroup?: SortOrderInput | SortOrder
    mobile?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    membershipId?: SortOrderInput | SortOrder
    paymentMode?: SortOrderInput | SortOrder
    mrp?: SortOrderInput | SortOrder
    sellingPrice?: SortOrderInput | SortOrder
    discountCouponCode?: SortOrderInput | SortOrder
    rawJson?: SortOrder
    rowHash?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type RkDataWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    rowHash?: string
    AND?: RkDataWhereInput | RkDataWhereInput[]
    OR?: RkDataWhereInput[]
    NOT?: RkDataWhereInput | RkDataWhereInput[]
    slNo?: IntNullableFilter<"RkData"> | number | null
    date?: DateTimeNullableFilter<"RkData"> | Date | string | null
    orderId?: StringNullableFilter<"RkData"> | string | null
    orderStatus?: StringNullableFilter<"RkData"> | string | null
    isbn?: StringNullableFilter<"RkData"> | string | null
    title?: StringNullableFilter<"RkData"> | string | null
    author?: StringNullableFilter<"RkData"> | string | null
    category?: StringNullableFilter<"RkData"> | string | null
    publicationName?: StringNullableFilter<"RkData"> | string | null
    releaseDate?: DateTimeNullableFilter<"RkData"> | Date | string | null
    noOfPages?: IntNullableFilter<"RkData"> | number | null
    name?: StringNullableFilter<"RkData"> | string | null
    pincode?: StringNullableFilter<"RkData"> | string | null
    gender?: StringNullableFilter<"RkData"> | string | null
    ageGroup?: StringNullableFilter<"RkData"> | string | null
    mobile?: StringNullableFilter<"RkData"> | string | null
    email?: StringNullableFilter<"RkData"> | string | null
    membershipId?: StringNullableFilter<"RkData"> | string | null
    paymentMode?: StringNullableFilter<"RkData"> | string | null
    mrp?: DecimalNullableFilter<"RkData"> | Decimal | DecimalJsLike | number | string | null
    sellingPrice?: DecimalNullableFilter<"RkData"> | Decimal | DecimalJsLike | number | string | null
    discountCouponCode?: StringNullableFilter<"RkData"> | string | null
    rawJson?: JsonFilter<"RkData">
    createdAt?: DateTimeFilter<"RkData"> | Date | string
  }, "id" | "rowHash">

  export type RkDataOrderByWithAggregationInput = {
    id?: SortOrder
    slNo?: SortOrderInput | SortOrder
    date?: SortOrderInput | SortOrder
    orderId?: SortOrderInput | SortOrder
    orderStatus?: SortOrderInput | SortOrder
    isbn?: SortOrderInput | SortOrder
    title?: SortOrderInput | SortOrder
    author?: SortOrderInput | SortOrder
    category?: SortOrderInput | SortOrder
    publicationName?: SortOrderInput | SortOrder
    releaseDate?: SortOrderInput | SortOrder
    noOfPages?: SortOrderInput | SortOrder
    name?: SortOrderInput | SortOrder
    pincode?: SortOrderInput | SortOrder
    gender?: SortOrderInput | SortOrder
    ageGroup?: SortOrderInput | SortOrder
    mobile?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    membershipId?: SortOrderInput | SortOrder
    paymentMode?: SortOrderInput | SortOrder
    mrp?: SortOrderInput | SortOrder
    sellingPrice?: SortOrderInput | SortOrder
    discountCouponCode?: SortOrderInput | SortOrder
    rawJson?: SortOrder
    rowHash?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: RkDataCountOrderByAggregateInput
    _avg?: RkDataAvgOrderByAggregateInput
    _max?: RkDataMaxOrderByAggregateInput
    _min?: RkDataMinOrderByAggregateInput
    _sum?: RkDataSumOrderByAggregateInput
  }

  export type RkDataScalarWhereWithAggregatesInput = {
    AND?: RkDataScalarWhereWithAggregatesInput | RkDataScalarWhereWithAggregatesInput[]
    OR?: RkDataScalarWhereWithAggregatesInput[]
    NOT?: RkDataScalarWhereWithAggregatesInput | RkDataScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"RkData"> | bigint | number
    slNo?: IntNullableWithAggregatesFilter<"RkData"> | number | null
    date?: DateTimeNullableWithAggregatesFilter<"RkData"> | Date | string | null
    orderId?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    orderStatus?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    isbn?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    title?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    author?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    category?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    publicationName?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    releaseDate?: DateTimeNullableWithAggregatesFilter<"RkData"> | Date | string | null
    noOfPages?: IntNullableWithAggregatesFilter<"RkData"> | number | null
    name?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    pincode?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    gender?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    ageGroup?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    mobile?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    email?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    membershipId?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    paymentMode?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    mrp?: DecimalNullableWithAggregatesFilter<"RkData"> | Decimal | DecimalJsLike | number | string | null
    sellingPrice?: DecimalNullableWithAggregatesFilter<"RkData"> | Decimal | DecimalJsLike | number | string | null
    discountCouponCode?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    rawJson?: JsonWithAggregatesFilter<"RkData">
    rowHash?: StringNullableWithAggregatesFilter<"RkData"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"RkData"> | Date | string
  }

  export type SaleCreateInput = {
    id?: bigint | number
    source: string
    orderNo?: string | null
    isbn?: string | null
    title?: string | null
    author?: string | null
    publisher?: string | null
    customerName?: string | null
    mobile?: string | null
    paymentMode?: string | null
    amount?: Decimal | DecimalJsLike | number | string | null
    qty?: number | null
    rate?: Decimal | DecimalJsLike | number | string | null
    date?: Date | string | null
    rawJson: JsonNullValueInput | InputJsonValue
    rowHash?: string | null
    createdAt?: Date | string
  }

  export type SaleUncheckedCreateInput = {
    id?: bigint | number
    source: string
    orderNo?: string | null
    isbn?: string | null
    title?: string | null
    author?: string | null
    publisher?: string | null
    customerName?: string | null
    mobile?: string | null
    paymentMode?: string | null
    amount?: Decimal | DecimalJsLike | number | string | null
    qty?: number | null
    rate?: Decimal | DecimalJsLike | number | string | null
    date?: Date | string | null
    rawJson: JsonNullValueInput | InputJsonValue
    rowHash?: string | null
    createdAt?: Date | string
  }

  export type SaleUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    source?: StringFieldUpdateOperationsInput | string
    orderNo?: NullableStringFieldUpdateOperationsInput | string | null
    isbn?: NullableStringFieldUpdateOperationsInput | string | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    author?: NullableStringFieldUpdateOperationsInput | string | null
    publisher?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: NullableStringFieldUpdateOperationsInput | string | null
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    paymentMode?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    qty?: NullableIntFieldUpdateOperationsInput | number | null
    rate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rawJson?: JsonNullValueInput | InputJsonValue
    rowHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SaleUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    source?: StringFieldUpdateOperationsInput | string
    orderNo?: NullableStringFieldUpdateOperationsInput | string | null
    isbn?: NullableStringFieldUpdateOperationsInput | string | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    author?: NullableStringFieldUpdateOperationsInput | string | null
    publisher?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: NullableStringFieldUpdateOperationsInput | string | null
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    paymentMode?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    qty?: NullableIntFieldUpdateOperationsInput | number | null
    rate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rawJson?: JsonNullValueInput | InputJsonValue
    rowHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SaleCreateManyInput = {
    id?: bigint | number
    source: string
    orderNo?: string | null
    isbn?: string | null
    title?: string | null
    author?: string | null
    publisher?: string | null
    customerName?: string | null
    mobile?: string | null
    paymentMode?: string | null
    amount?: Decimal | DecimalJsLike | number | string | null
    qty?: number | null
    rate?: Decimal | DecimalJsLike | number | string | null
    date?: Date | string | null
    rawJson: JsonNullValueInput | InputJsonValue
    rowHash?: string | null
    createdAt?: Date | string
  }

  export type SaleUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    source?: StringFieldUpdateOperationsInput | string
    orderNo?: NullableStringFieldUpdateOperationsInput | string | null
    isbn?: NullableStringFieldUpdateOperationsInput | string | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    author?: NullableStringFieldUpdateOperationsInput | string | null
    publisher?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: NullableStringFieldUpdateOperationsInput | string | null
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    paymentMode?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    qty?: NullableIntFieldUpdateOperationsInput | number | null
    rate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rawJson?: JsonNullValueInput | InputJsonValue
    rowHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SaleUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    source?: StringFieldUpdateOperationsInput | string
    orderNo?: NullableStringFieldUpdateOperationsInput | string | null
    isbn?: NullableStringFieldUpdateOperationsInput | string | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    author?: NullableStringFieldUpdateOperationsInput | string | null
    publisher?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: NullableStringFieldUpdateOperationsInput | string | null
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    paymentMode?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    qty?: NullableIntFieldUpdateOperationsInput | number | null
    rate?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    rawJson?: JsonNullValueInput | InputJsonValue
    rowHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RkDataCreateInput = {
    id?: bigint | number
    slNo?: number | null
    date?: Date | string | null
    orderId?: string | null
    orderStatus?: string | null
    isbn?: string | null
    title?: string | null
    author?: string | null
    category?: string | null
    publicationName?: string | null
    releaseDate?: Date | string | null
    noOfPages?: number | null
    name?: string | null
    pincode?: string | null
    gender?: string | null
    ageGroup?: string | null
    mobile?: string | null
    email?: string | null
    membershipId?: string | null
    paymentMode?: string | null
    mrp?: Decimal | DecimalJsLike | number | string | null
    sellingPrice?: Decimal | DecimalJsLike | number | string | null
    discountCouponCode?: string | null
    rawJson: JsonNullValueInput | InputJsonValue
    rowHash?: string | null
    createdAt?: Date | string
  }

  export type RkDataUncheckedCreateInput = {
    id?: bigint | number
    slNo?: number | null
    date?: Date | string | null
    orderId?: string | null
    orderStatus?: string | null
    isbn?: string | null
    title?: string | null
    author?: string | null
    category?: string | null
    publicationName?: string | null
    releaseDate?: Date | string | null
    noOfPages?: number | null
    name?: string | null
    pincode?: string | null
    gender?: string | null
    ageGroup?: string | null
    mobile?: string | null
    email?: string | null
    membershipId?: string | null
    paymentMode?: string | null
    mrp?: Decimal | DecimalJsLike | number | string | null
    sellingPrice?: Decimal | DecimalJsLike | number | string | null
    discountCouponCode?: string | null
    rawJson: JsonNullValueInput | InputJsonValue
    rowHash?: string | null
    createdAt?: Date | string
  }

  export type RkDataUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    slNo?: NullableIntFieldUpdateOperationsInput | number | null
    date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    orderId?: NullableStringFieldUpdateOperationsInput | string | null
    orderStatus?: NullableStringFieldUpdateOperationsInput | string | null
    isbn?: NullableStringFieldUpdateOperationsInput | string | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    author?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    publicationName?: NullableStringFieldUpdateOperationsInput | string | null
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    noOfPages?: NullableIntFieldUpdateOperationsInput | number | null
    name?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    ageGroup?: NullableStringFieldUpdateOperationsInput | string | null
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    membershipId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentMode?: NullableStringFieldUpdateOperationsInput | string | null
    mrp?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    sellingPrice?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountCouponCode?: NullableStringFieldUpdateOperationsInput | string | null
    rawJson?: JsonNullValueInput | InputJsonValue
    rowHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RkDataUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    slNo?: NullableIntFieldUpdateOperationsInput | number | null
    date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    orderId?: NullableStringFieldUpdateOperationsInput | string | null
    orderStatus?: NullableStringFieldUpdateOperationsInput | string | null
    isbn?: NullableStringFieldUpdateOperationsInput | string | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    author?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    publicationName?: NullableStringFieldUpdateOperationsInput | string | null
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    noOfPages?: NullableIntFieldUpdateOperationsInput | number | null
    name?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    ageGroup?: NullableStringFieldUpdateOperationsInput | string | null
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    membershipId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentMode?: NullableStringFieldUpdateOperationsInput | string | null
    mrp?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    sellingPrice?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountCouponCode?: NullableStringFieldUpdateOperationsInput | string | null
    rawJson?: JsonNullValueInput | InputJsonValue
    rowHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RkDataCreateManyInput = {
    id?: bigint | number
    slNo?: number | null
    date?: Date | string | null
    orderId?: string | null
    orderStatus?: string | null
    isbn?: string | null
    title?: string | null
    author?: string | null
    category?: string | null
    publicationName?: string | null
    releaseDate?: Date | string | null
    noOfPages?: number | null
    name?: string | null
    pincode?: string | null
    gender?: string | null
    ageGroup?: string | null
    mobile?: string | null
    email?: string | null
    membershipId?: string | null
    paymentMode?: string | null
    mrp?: Decimal | DecimalJsLike | number | string | null
    sellingPrice?: Decimal | DecimalJsLike | number | string | null
    discountCouponCode?: string | null
    rawJson: JsonNullValueInput | InputJsonValue
    rowHash?: string | null
    createdAt?: Date | string
  }

  export type RkDataUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    slNo?: NullableIntFieldUpdateOperationsInput | number | null
    date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    orderId?: NullableStringFieldUpdateOperationsInput | string | null
    orderStatus?: NullableStringFieldUpdateOperationsInput | string | null
    isbn?: NullableStringFieldUpdateOperationsInput | string | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    author?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    publicationName?: NullableStringFieldUpdateOperationsInput | string | null
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    noOfPages?: NullableIntFieldUpdateOperationsInput | number | null
    name?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    ageGroup?: NullableStringFieldUpdateOperationsInput | string | null
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    membershipId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentMode?: NullableStringFieldUpdateOperationsInput | string | null
    mrp?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    sellingPrice?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountCouponCode?: NullableStringFieldUpdateOperationsInput | string | null
    rawJson?: JsonNullValueInput | InputJsonValue
    rowHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RkDataUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    slNo?: NullableIntFieldUpdateOperationsInput | number | null
    date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    orderId?: NullableStringFieldUpdateOperationsInput | string | null
    orderStatus?: NullableStringFieldUpdateOperationsInput | string | null
    isbn?: NullableStringFieldUpdateOperationsInput | string | null
    title?: NullableStringFieldUpdateOperationsInput | string | null
    author?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    publicationName?: NullableStringFieldUpdateOperationsInput | string | null
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    noOfPages?: NullableIntFieldUpdateOperationsInput | number | null
    name?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    ageGroup?: NullableStringFieldUpdateOperationsInput | string | null
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    membershipId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentMode?: NullableStringFieldUpdateOperationsInput | string | null
    mrp?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    sellingPrice?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountCouponCode?: NullableStringFieldUpdateOperationsInput | string | null
    rawJson?: JsonNullValueInput | InputJsonValue
    rowHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }
  export type JsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type SaleCountOrderByAggregateInput = {
    id?: SortOrder
    source?: SortOrder
    orderNo?: SortOrder
    isbn?: SortOrder
    title?: SortOrder
    author?: SortOrder
    publisher?: SortOrder
    customerName?: SortOrder
    mobile?: SortOrder
    paymentMode?: SortOrder
    amount?: SortOrder
    qty?: SortOrder
    rate?: SortOrder
    date?: SortOrder
    rawJson?: SortOrder
    rowHash?: SortOrder
    createdAt?: SortOrder
  }

  export type SaleAvgOrderByAggregateInput = {
    id?: SortOrder
    amount?: SortOrder
    qty?: SortOrder
    rate?: SortOrder
  }

  export type SaleMaxOrderByAggregateInput = {
    id?: SortOrder
    source?: SortOrder
    orderNo?: SortOrder
    isbn?: SortOrder
    title?: SortOrder
    author?: SortOrder
    publisher?: SortOrder
    customerName?: SortOrder
    mobile?: SortOrder
    paymentMode?: SortOrder
    amount?: SortOrder
    qty?: SortOrder
    rate?: SortOrder
    date?: SortOrder
    rowHash?: SortOrder
    createdAt?: SortOrder
  }

  export type SaleMinOrderByAggregateInput = {
    id?: SortOrder
    source?: SortOrder
    orderNo?: SortOrder
    isbn?: SortOrder
    title?: SortOrder
    author?: SortOrder
    publisher?: SortOrder
    customerName?: SortOrder
    mobile?: SortOrder
    paymentMode?: SortOrder
    amount?: SortOrder
    qty?: SortOrder
    rate?: SortOrder
    date?: SortOrder
    rowHash?: SortOrder
    createdAt?: SortOrder
  }

  export type SaleSumOrderByAggregateInput = {
    id?: SortOrder
    amount?: SortOrder
    qty?: SortOrder
    rate?: SortOrder
  }

  export type BigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type RkDataCountOrderByAggregateInput = {
    id?: SortOrder
    slNo?: SortOrder
    date?: SortOrder
    orderId?: SortOrder
    orderStatus?: SortOrder
    isbn?: SortOrder
    title?: SortOrder
    author?: SortOrder
    category?: SortOrder
    publicationName?: SortOrder
    releaseDate?: SortOrder
    noOfPages?: SortOrder
    name?: SortOrder
    pincode?: SortOrder
    gender?: SortOrder
    ageGroup?: SortOrder
    mobile?: SortOrder
    email?: SortOrder
    membershipId?: SortOrder
    paymentMode?: SortOrder
    mrp?: SortOrder
    sellingPrice?: SortOrder
    discountCouponCode?: SortOrder
    rawJson?: SortOrder
    rowHash?: SortOrder
    createdAt?: SortOrder
  }

  export type RkDataAvgOrderByAggregateInput = {
    id?: SortOrder
    slNo?: SortOrder
    noOfPages?: SortOrder
    mrp?: SortOrder
    sellingPrice?: SortOrder
  }

  export type RkDataMaxOrderByAggregateInput = {
    id?: SortOrder
    slNo?: SortOrder
    date?: SortOrder
    orderId?: SortOrder
    orderStatus?: SortOrder
    isbn?: SortOrder
    title?: SortOrder
    author?: SortOrder
    category?: SortOrder
    publicationName?: SortOrder
    releaseDate?: SortOrder
    noOfPages?: SortOrder
    name?: SortOrder
    pincode?: SortOrder
    gender?: SortOrder
    ageGroup?: SortOrder
    mobile?: SortOrder
    email?: SortOrder
    membershipId?: SortOrder
    paymentMode?: SortOrder
    mrp?: SortOrder
    sellingPrice?: SortOrder
    discountCouponCode?: SortOrder
    rowHash?: SortOrder
    createdAt?: SortOrder
  }

  export type RkDataMinOrderByAggregateInput = {
    id?: SortOrder
    slNo?: SortOrder
    date?: SortOrder
    orderId?: SortOrder
    orderStatus?: SortOrder
    isbn?: SortOrder
    title?: SortOrder
    author?: SortOrder
    category?: SortOrder
    publicationName?: SortOrder
    releaseDate?: SortOrder
    noOfPages?: SortOrder
    name?: SortOrder
    pincode?: SortOrder
    gender?: SortOrder
    ageGroup?: SortOrder
    mobile?: SortOrder
    email?: SortOrder
    membershipId?: SortOrder
    paymentMode?: SortOrder
    mrp?: SortOrder
    sellingPrice?: SortOrder
    discountCouponCode?: SortOrder
    rowHash?: SortOrder
    createdAt?: SortOrder
  }

  export type RkDataSumOrderByAggregateInput = {
    id?: SortOrder
    slNo?: SortOrder
    noOfPages?: SortOrder
    mrp?: SortOrder
    sellingPrice?: SortOrder
  }

  export type BigIntFieldUpdateOperationsInput = {
    set?: bigint | number
    increment?: bigint | number
    decrement?: bigint | number
    multiply?: bigint | number
    divide?: bigint | number
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NestedBigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedBigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use SaleDefaultArgs instead
     */
    export type SaleArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SaleDefaultArgs<ExtArgs>
    /**
     * @deprecated Use RkDataDefaultArgs instead
     */
    export type RkDataArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = RkDataDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}
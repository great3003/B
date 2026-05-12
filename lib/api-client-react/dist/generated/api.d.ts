import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { Account, AccountBalances, CreateAccountBody, ErrorResponse, GasFeeInfo, HealthStatus, SwapHistoryEntry, SwapQuoteRequest, SwapQuoteResult, SwapRequest, SwapResult, UpdateAccountSettingsBody } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * Returns server health status
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all accounts
 */
export declare const getListAccountsUrl: () => string;
export declare const listAccounts: (options?: RequestInit) => Promise<Account[]>;
export declare const getListAccountsQueryKey: () => readonly ["/api/accounts"];
export declare const getListAccountsQueryOptions: <TData = Awaited<ReturnType<typeof listAccounts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAccounts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAccounts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAccountsQueryResult = NonNullable<Awaited<ReturnType<typeof listAccounts>>>;
export type ListAccountsQueryError = ErrorType<unknown>;
/**
 * @summary List all accounts
 */
export declare function useListAccounts<TData = Awaited<ReturnType<typeof listAccounts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAccounts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add a new account
 */
export declare const getCreateAccountUrl: () => string;
export declare const createAccount: (createAccountBody: CreateAccountBody, options?: RequestInit) => Promise<Account>;
export declare const getCreateAccountMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAccount>>, TError, {
        data: BodyType<CreateAccountBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAccount>>, TError, {
    data: BodyType<CreateAccountBody>;
}, TContext>;
export type CreateAccountMutationResult = NonNullable<Awaited<ReturnType<typeof createAccount>>>;
export type CreateAccountMutationBody = BodyType<CreateAccountBody>;
export type CreateAccountMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Add a new account
 */
export declare const useCreateAccount: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAccount>>, TError, {
        data: BodyType<CreateAccountBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAccount>>, TError, {
    data: BodyType<CreateAccountBody>;
}, TContext>;
/**
 * @summary Remove an account
 */
export declare const getDeleteAccountUrl: (id: number) => string;
export declare const deleteAccount: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteAccountMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAccount>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAccount>>, TError, {
    id: number;
}, TContext>;
export type DeleteAccountMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAccount>>>;
export type DeleteAccountMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Remove an account
 */
export declare const useDeleteAccount: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAccount>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAccount>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get token balances for an account
 */
export declare const getGetAccountBalancesUrl: (id: number) => string;
export declare const getAccountBalances: (id: number, options?: RequestInit) => Promise<AccountBalances>;
export declare const getGetAccountBalancesQueryKey: (id: number) => readonly [`/api/accounts/${number}/balances`];
export declare const getGetAccountBalancesQueryOptions: <TData = Awaited<ReturnType<typeof getAccountBalances>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAccountBalances>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAccountBalances>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAccountBalancesQueryResult = NonNullable<Awaited<ReturnType<typeof getAccountBalances>>>;
export type GetAccountBalancesQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get token balances for an account
 */
export declare function useGetAccountBalances<TData = Awaited<ReturnType<typeof getAccountBalances>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAccountBalances>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Execute a swap for a specific account
 */
export declare const getExecuteSwapUrl: (id: number) => string;
export declare const executeSwap: (id: number, swapRequest: SwapRequest, options?: RequestInit) => Promise<SwapResult>;
export declare const getExecuteSwapMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof executeSwap>>, TError, {
        id: number;
        data: BodyType<SwapRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof executeSwap>>, TError, {
    id: number;
    data: BodyType<SwapRequest>;
}, TContext>;
export type ExecuteSwapMutationResult = NonNullable<Awaited<ReturnType<typeof executeSwap>>>;
export type ExecuteSwapMutationBody = BodyType<SwapRequest>;
export type ExecuteSwapMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Execute a swap for a specific account
 */
export declare const useExecuteSwap: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof executeSwap>>, TError, {
        id: number;
        data: BodyType<SwapRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof executeSwap>>, TError, {
    id: number;
    data: BodyType<SwapRequest>;
}, TContext>;
/**
 * @summary Get swap quote for a specific account
 */
export declare const getGetSwapQuoteUrl: (id: number) => string;
export declare const getSwapQuote: (id: number, swapQuoteRequest: SwapQuoteRequest, options?: RequestInit) => Promise<SwapQuoteResult>;
export declare const getGetSwapQuoteMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof getSwapQuote>>, TError, {
        id: number;
        data: BodyType<SwapQuoteRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof getSwapQuote>>, TError, {
    id: number;
    data: BodyType<SwapQuoteRequest>;
}, TContext>;
export type GetSwapQuoteMutationResult = NonNullable<Awaited<ReturnType<typeof getSwapQuote>>>;
export type GetSwapQuoteMutationBody = BodyType<SwapQuoteRequest>;
export type GetSwapQuoteMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Get swap quote for a specific account
 */
export declare const useGetSwapQuote: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof getSwapQuote>>, TError, {
        id: number;
        data: BodyType<SwapQuoteRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof getSwapQuote>>, TError, {
    id: number;
    data: BodyType<SwapQuoteRequest>;
}, TContext>;
/**
 * @summary Update auto-swap settings for an account
 */
export declare const getUpdateAccountSettingsUrl: (id: number) => string;
export declare const updateAccountSettings: (id: number, updateAccountSettingsBody: UpdateAccountSettingsBody, options?: RequestInit) => Promise<Account>;
export declare const getUpdateAccountSettingsMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAccountSettings>>, TError, {
        id: number;
        data: BodyType<UpdateAccountSettingsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAccountSettings>>, TError, {
    id: number;
    data: BodyType<UpdateAccountSettingsBody>;
}, TContext>;
export type UpdateAccountSettingsMutationResult = NonNullable<Awaited<ReturnType<typeof updateAccountSettings>>>;
export type UpdateAccountSettingsMutationBody = BodyType<UpdateAccountSettingsBody>;
export type UpdateAccountSettingsMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Update auto-swap settings for an account
 */
export declare const useUpdateAccountSettings: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAccountSettings>>, TError, {
        id: number;
        data: BodyType<UpdateAccountSettingsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAccountSettings>>, TError, {
    id: number;
    data: BodyType<UpdateAccountSettingsBody>;
}, TContext>;
/**
 * @summary Get current gas fee estimate
 */
export declare const getGetGasFeeUrl: () => string;
export declare const getGasFee: (options?: RequestInit) => Promise<GasFeeInfo>;
export declare const getGetGasFeeQueryKey: () => readonly ["/api/gas"];
export declare const getGetGasFeeQueryOptions: <TData = Awaited<ReturnType<typeof getGasFee>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGasFee>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getGasFee>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetGasFeeQueryResult = NonNullable<Awaited<ReturnType<typeof getGasFee>>>;
export type GetGasFeeQueryError = ErrorType<unknown>;
/**
 * @summary Get current gas fee estimate
 */
export declare function useGetGasFee<TData = Awaited<ReturnType<typeof getGasFee>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGasFee>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get swap history across all accounts
 */
export declare const getListSwapHistoryUrl: () => string;
export declare const listSwapHistory: (options?: RequestInit) => Promise<SwapHistoryEntry[]>;
export declare const getListSwapHistoryQueryKey: () => readonly ["/api/swap-history"];
export declare const getListSwapHistoryQueryOptions: <TData = Awaited<ReturnType<typeof listSwapHistory>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSwapHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSwapHistory>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSwapHistoryQueryResult = NonNullable<Awaited<ReturnType<typeof listSwapHistory>>>;
export type ListSwapHistoryQueryError = ErrorType<unknown>;
/**
 * @summary Get swap history across all accounts
 */
export declare function useListSwapHistory<TData = Awaited<ReturnType<typeof listSwapHistory>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSwapHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map
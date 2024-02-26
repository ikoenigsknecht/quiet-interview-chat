import { SortDirection } from "./redis.enums";

export type FtsearchResultMap<T> = Map<string, T>;

export type FtsearchResult<T> = {
    count: number,
    result: FtsearchResultMap<T>
}

export type FtSearchSortOptions = {
    sortBy: string;
    direction: SortDirection
}
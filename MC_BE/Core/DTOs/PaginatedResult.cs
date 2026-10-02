using System;
using System.Collections.Generic;

namespace MC_BE.Core.DTOs;

public class PaginatedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalItems { get; set; }
    public int Page { get; set; }
    public int Limit { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalItems / (Limit > 0 ? Limit : 1));

    public PaginatedResult() { }

    public PaginatedResult(List<T> items, int totalItems, int page, int limit)
    {
        Items = items;
        TotalItems = totalItems;
        Page = page;
        Limit = limit;
    }
}

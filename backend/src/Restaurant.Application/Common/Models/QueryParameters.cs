namespace Restaurant.Application.Common.Models;

/// <summary>Shared paging/search/sort inputs. Page size is clamped so a client cannot ask for everything.</summary>
public abstract class QueryParameters
{
    private const int MaxPageSize = 100;

    private int _page = 1;
    private int _pageSize = 12;

    public int Page
    {
        get => _page;
        set => _page = value < 1 ? 1 : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value switch
        {
            < 1 => 1,
            > MaxPageSize => MaxPageSize,
            _ => value
        };
    }

    /// <summary>Free-text search term; interpreted per endpoint.</summary>
    public string? Search { get; set; }

    /// <summary>Sort key, e.g. "price" or "name". Endpoints map this to a whitelisted column.</summary>
    public string? SortBy { get; set; }

    public bool SortDescending { get; set; }
}

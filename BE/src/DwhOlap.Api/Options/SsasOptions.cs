namespace DwhOlap.Api.Options;

public sealed class SsasOptions
{
    public const string SectionName = "SsasOptions";

    public string Server { get; set; } = "localhost\\SQL01";

    public string Catalog { get; set; } = "DWH";

    public bool UseIntegratedSecurity { get; set; } = true;

    public string Username { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public int ConnectionTimeoutSeconds { get; set; } = 15;

    public string CubeBanHang { get; set; } = "CubeBanHang";

    public string CubeTonKho { get; set; } = "CubeTonKho";

    public string MeasureTongDoanhThu { get; set; } = "Tong Tien";

    public string MeasureSoLuongTonKho { get; set; } = "Soluongtrongkho";
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("PAYMENT_TRANSACTION")]
public class PaymentTransaction
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("TransactionID")]
    public int TransactionId { get; set; }

    [Required]
    [Column("PaymentID")]
    public int PaymentId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("GatewayName")]
    public string GatewayName { get; set; } = string.Empty;

    [MaxLength(100)]
    [Column("GatewayTransactionCode")]
    public string? GatewayTransactionCode { get; set; }

    [MaxLength(50)]
    [Column("ResponseCode")]
    public string? ResponseCode { get; set; }

    [MaxLength(20)]
    [Column("BankCode")]
    public string? BankCode { get; set; }

    [Required]
    [Column("TransactionAmount", TypeName = "decimal(10,2)")]
    public decimal TransactionAmount { get; set; }

    [Column("TransactionStatus")]
    public TransactionStatus TransactionStatus { get; set; } = TransactionStatus.PENDING;

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("PaymentId")]
    public virtual Payment Payment { get; set; } = null!;
}

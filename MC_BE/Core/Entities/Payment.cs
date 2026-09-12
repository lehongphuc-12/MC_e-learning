using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("PAYMENT")]
public class Payment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("PaymentID")]
    public int PaymentId { get; set; }

    [Required]
    [Column("UserID")]
    public int UserId { get; set; }

    [Required]
    [Column("EnrollmentID")]
    public int EnrollmentId { get; set; }

    [Required]
    [Column("Amount", TypeName = "decimal(10,2)")]
    public decimal Amount { get; set; }

    [Required]
    [Column("PaymentMethod")]
    public PaymentMethod PaymentMethod { get; set; }

    [Column("PaymentStatus")]
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.PENDING;

    [Column("PaymentDate")]
    public DateTime? PaymentDate { get; set; }

    [MaxLength(100)]
    [Column("TransactionRef")]
    public string? TransactionRef { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;

    [ForeignKey("EnrollmentId")]
    public virtual Enrollment Enrollment { get; set; } = null!;

    public virtual ICollection<PaymentTransaction> Transactions { get; set; } = new List<PaymentTransaction>();
}

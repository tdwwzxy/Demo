package com.shiguang.shopping;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

/** DTO 使用 record 表达不可变数据；价格始终使用 BigDecimal，避免浮点误差。 */
public final class Models {
    private Models() {}
    public record Product(long id, String sku, String name, String category, String material,
            BigDecimal price, BigDecimal weightMin, BigDecimal weightMax, BigDecimal laborFee,
            int stock, String imageUrl, String imageCrop, String description,
            boolean featured, boolean fresh, boolean active, String updatedAt) {}

    public record ProductInput(
            @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{2,48}") String sku,
            @NotBlank @Size(max=120) String name,
            @NotBlank @Size(max=32) String category,
            @NotBlank @Size(max=32) String material,
            @NotNull @DecimalMin("0.01") @Digits(integer=9, fraction=2) BigDecimal price,
            @NotNull @DecimalMin("0") @Digits(integer=6, fraction=3) BigDecimal weightMin,
            @NotNull @DecimalMin("0") @Digits(integer=6, fraction=3) BigDecimal weightMax,
            @NotNull @DecimalMin("0") @Digits(integer=8, fraction=2) BigDecimal laborFee,
            @NotNull @Min(0) @Max(999999) Integer stock,
            @NotBlank @Size(max=240) String imageUrl,
            @NotNull @Size(max=32) String imageCrop,
            @NotNull @Size(max=2000) String description,
            boolean featured, boolean fresh, boolean active) {}

    public record OrderLineInput(@Min(1) long productId, @Min(1) @Max(99) int quantity) {}
    public record OrderInput(
            @NotBlank @Size(max=40) String customerName,
            @NotBlank @Pattern(regexp="[0-9+() -]{6,30}") String phone,
            @NotBlank @Size(min=5,max=300) String address,
            @NotNull @Size(max=500) String note,
            @NotEmpty @Size(max=50) List<@NotNull @Valid OrderLineInput> items) {}
    public record OrderItem(long productId, String name, String sku, BigDecimal price,
            int quantity, String imageUrl, String imageCrop) {}
    public record ShopOrder(String id, String customerName, String phone, String address, String note,
            String status, BigDecimal total, String createdAt, String updatedAt, List<OrderItem> items) {}
    public record StatusInput(@NotBlank String status) {}
    public record GoldPrice(String material, BigDecimal price, String source, String updatedAt) {}
    public record GoldInput(@NotNull @DecimalMin("0.01") @Digits(integer=9,fraction=2) BigDecimal price,
            @NotBlank @Size(max=100) String source) {}
    public record StoreInput(@NotBlank @Size(max=60) String name,
            @NotBlank @Size(max=160) String tagline, @NotNull @Size(max=30) String phone,
            @NotNull @Size(max=80) String wechat, @NotNull @Size(max=300) String notice) {}
}

package contextutils

import (
	"context"
	"errors"
)

// TenantKeyType defines the type for context keys to prevent collisions
type TenantKeyType string

// TenantIDKey is the typed context key for tenant ID
const TenantIDKey TenantKeyType = "tenant_id"

// ErrTenantMissing is returned when a business operation is attempted without a valid Tenant ID
var ErrTenantMissing = errors.New("tenant_id ausente no contexto")

// GetTenantID extracts the tenant ID from the context safely
func GetTenantID(ctx context.Context) (string, error) {
	tenantID, ok := ctx.Value(TenantIDKey).(string)
	if !ok || tenantID == "" {
		return "", ErrTenantMissing
	}
	return tenantID, nil
}

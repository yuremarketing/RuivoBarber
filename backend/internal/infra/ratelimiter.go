package infra

import (
	"context"
	"errors"
	"sync"
	"time"
)

var (
	ErrRateLimitExceeded = errors.New("rate limit exceeded")

	mu           sync.Mutex
	tokens       = 60.0
	maxTokens    = 60.0
	refillRate   = 10.0 // tokens per second
	lastRefilled = time.Now()
)

// Wait controls the API rate limiting using a token bucket algorithm.
func Wait(ctx context.Context) error {
	mu.Lock()
	defer mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(lastRefilled).Seconds()
	lastRefilled = now

	tokens += elapsed * refillRate
	if tokens > maxTokens {
		tokens = maxTokens
	}

	if tokens < 1.0 {
		return ErrRateLimitExceeded
	}

	tokens -= 1.0
	return nil
}

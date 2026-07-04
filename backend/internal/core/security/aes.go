package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"io"
	"os"
)

var defaultSecretKey = []byte("ruivobarber_secure_aes_32_bytes!") // 32 bytes for AES-256

func getSecretKey() []byte {
	key := os.Getenv("AES_SECRET_KEY")
	if key != "" && len(key) == 32 {
		return []byte(key)
	}
	return defaultSecretKey
}

// Encrypt encrypts plain text string into base64 encoded string
func Encrypt(text string) (string, error) {
	if text == "" {
		return "", nil
	}
	
	key := getSecretKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	plaintext := []byte(text)
	ciphertext := make([]byte, aes.BlockSize+len(plaintext))
	iv := ciphertext[:aes.BlockSize]
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", err
	}

	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext[aes.BlockSize:], plaintext)

	return base64.URLEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts base64 encoded string into plain text string. If it fails (e.g. legacy plain text), returns original.
func Decrypt(cryptoText string) string {
	if cryptoText == "" {
		return ""
	}

	key := getSecretKey()
	ciphertext, err := base64.URLEncoding.DecodeString(cryptoText)
	if err != nil {
		return cryptoText // fallback for non-encrypted legacy data
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return cryptoText
	}

	if len(ciphertext) < aes.BlockSize {
		return cryptoText
	}
	iv := ciphertext[:aes.BlockSize]
	ciphertext = ciphertext[aes.BlockSize:]

	stream := cipher.NewCFBDecrypter(block, iv)
	stream.XORKeyStream(ciphertext, ciphertext)

	return string(ciphertext)
}

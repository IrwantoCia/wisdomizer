package validation

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

func Validate[T any]() gin.HandlerFunc {
	return func(c *gin.Context) {
		var payload T

		// Bind JSON request body to struct
		if err := c.ShouldBind(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			c.Abort()
			return
		}

		// Validate struct fields
		if err := validate.Struct(payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": parseValidateStructError(err)})
			c.Abort()
			return
		}

		// Store validated payload in context
		c.Set("payload", payload)
		c.Next()
	}
}

func parseValidateStructError(err error) string {
	if err == nil {
		return ""
	}

	// Check for InvalidValidationError first
	if _, ok := err.(*validator.InvalidValidationError); ok {
		return "Invalid validation error: the provided struct is not valid for validation"
	}

	// Try to extract validation errors
	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok {
		return "Invalid request format"
	}

	// If we have validation errors, create a user-friendly message
	if len(validationErrors) > 0 {
		firstError := validationErrors[0]
		fieldName := firstError.Field()
		tag := firstError.Tag()

		switch tag {
		case "required":
			return fieldName + " is required"
		case "email":
			return fieldName + " must be a valid email address"
		case "min":
			return fieldName + " must be at least " + firstError.Param() + " characters long"
		case "max":
			return fieldName + " must be at most " + firstError.Param() + " characters long"
		case "oneof":
			return fieldName + " must be one of: " + firstError.Param()
		case "numeric":
			return fieldName + " must be a number"
		case "alphanum":
			return fieldName + " must contain only letters and numbers"
		default:
			return fieldName + " failed validation: " + tag
		}
	}

	return "Validation failed"
}

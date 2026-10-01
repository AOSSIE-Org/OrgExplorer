# Makefile for OrgExplorer API & Schema Validation

.PHONY: install validate-api test

# Install project and development dependencies
install:
	npm install

# Run the GraphQL and REST API schema validation script
validate-api:
	npm run validate-api

# Alias for validation (useful in generic test runner context)
test: validate-api

# Discente Update API Documentation

## Overview

The Discente Update API provides comprehensive functionality for updating student (discente) records with proper authentication, authorization, and validation.

## Available Routes

### 1. General Discente Update

**Endpoint:** `PUT /api/discenti/:id`
**Method:** PUT
**Authentication:** Required
**Authorization:** User can update their own discenti OR Admin can update any discente

#### Request Headers

```json
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

#### Request Body

```json
{
  "nome": "Mario",
  "cognome": "Rossi",
  "codiceFiscale": "RSSMRA85M01H501Z",
  "telefono": "123456789",
  "email": "mario.rossi@email.com",
  "dataNascita": "1985-08-01",
  "luogoNascita": "Roma",
  "provinciaNascita": "RM",
  "regioneNascita": "Lazio",
  "residenza": "Via Roma 1",
  "provinciaResidenza": "RM",
  "regioneResidenza": "Lazio",
  "capResidenza": "00100",
  "professione": "Infermiere",
  "titoloDiStudio": "Laurea"
}
```

#### Response Examples

**Success (200)**

```json
{
  "message": "Discente aggiornato con successo",
  "discente": {
    "_id": "64f123456789abcd12345678",
    "nome": "Mario",
    "cognome": "Rossi",
    "codiceFiscale": "RSSMRA85M01H501Z",
    // ... other fields
    "userId": {
      "_id": "64f123456789abcd12345679",
      "email": "user@example.com",
      "nome": "Centro Test"
    }
  }
}
```

**Error - Not Found (404)**

```json
{
  "message": "Discente non trovato"
}
```

**Error - Unauthorized (403)**

```json
{
  "message": "Non autorizzato ad aggiornare questo discente"
}
```

**Error - Duplicate Codice Fiscale (400)**

```json
{
  "message": "Codice fiscale già esistente per un altro discente"
}
```

**Error - Validation (400)**

```json
{
  "message": "Errori di validazione",
  "errors": ["Email non valida", "Codice fiscale richiesto"]
}
```

### 2. Patent Number Update (Legacy)

**Endpoint:** `PATCH /api/discenti/:id/patent`
**Method:** PATCH
**Authentication:** Required
**Purpose:** Specific route for updating patent numbers and kit assignments

#### Request Body

```json
{
  "patentNumber": "KIT123456"
}
```

## Security Features

### 1. Authentication

- All routes require valid JWT token
- Token must be provided in Authorization header as Bearer token

### 2. Authorization

- **Regular Users:** Can only update discenti they own (where userId matches their ID)
- **Admins:** Can update any discente
- Authorization is checked before any update operations

### 3. Data Validation

- **Codice Fiscale Uniqueness:** Prevents duplicate fiscal codes across different discenti
- **MongoDB Validation:** All model validations are enforced
- **Field Cleaning:** Empty/null values are filtered out before update
- **Input Sanitization:** Validates all input fields according to model schema

### 4. Error Handling

- Comprehensive error handling for all failure scenarios
- Specific error messages for different validation failures
- Proper HTTP status codes for each error type

## Usage Examples

### Frontend JavaScript Example

```javascript
// Update a discente (admin or owner)
const updateDiscente = async (discenteId, updateData, token) => {
  try {
    const response = await fetch(`/api/discenti/${discenteId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const result = await response.json();
    console.log('Discente updated:', result.discente);
    return result;
  } catch (error) {
    console.error('Update failed:', error.message);
    throw error;
  }
};

// Usage
const updateData = {
  nome: 'Mario',
  cognome: 'Rossi',
  telefono: '123456789',
};

updateDiscente('64f123456789abcd12345678', updateData, userToken);
```

### cURL Example

```bash
# Update discente
curl -X PUT http://localhost:5000/api/discenti/64f123456789abcd12345678 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Mario",
    "cognome": "Rossi",
    "telefono": "123456789"
  }'
```

## Database Schema

The update operation supports all fields defined in the Discente model:

- Personal information (nome, cognome, codiceFiscale, etc.)
- Contact information (telefono, email, residenza, etc.)
- Professional information (professione, titoloDiStudio)
- Geographic information (provinces, regions, postal codes)
- Kit assignments and patent numbers

## Best Practices

1. **Always validate input** on the frontend before sending to API
2. **Handle errors gracefully** and show meaningful messages to users
3. **Use appropriate HTTP methods** (PUT for full updates, PATCH for partial updates)
4. **Check user permissions** before allowing update operations in UI
5. **Provide feedback** to users about the success/failure of operations

## Migration Notes

- The old `PATCH /api/discenti/:id` route has been moved to `PATCH /api/discenti/:id/patent`
- The new `PUT /api/discenti/:id` route provides comprehensive update functionality
- Both routes maintain backward compatibility with existing implementations

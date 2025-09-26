# JohnConnect API v1

## `/api/v1/`

This route encompasses all of JohnConnect's API.

Request requirements will return a `400` status code and a list of problems with your requests if the Request requirements aren't met.

### `/api/v1/account`

#### POST `/api/v1/account/register`

Type: `application/json`
Example request body: `{"username": "nano", "password": "ohioohio"}`

Request requirements:

- username must be between 1 and 20 characters
- password must be between 1 and 128 characters

Possible responses:
`403`: Server is not in open registration mode
`500`: Database is experiencing issues checking for an existing user with your username or creating your user
`400`: Username is already in use on this server
`200`: Authorized, new token included in `token` response field

#### POST `/api/v1/account/login`

Type: `application/json`
Example request body: `{"username": "nano", "password": "ohioohio"}`

Request requirements:

- username must be between 1 and 20 characters
- password must be between 1 and 128 characters

Possible responses:
`401`: Incorrect username or password
`500`: Database is experiencing issues
`200`: Authorized, new token included in `token` response field

#### DELETE `/api/v1/account`

Type: `application/json`
Example request headers: `Authorization: Bearer {JWT}`

Request requirements:

- Authorization header must be set with a valid token

Possible responses:
`200`: User deleted
`500`: Database error

Client design considerations:
Make absolutely sure that the user wants this. Once an account is deleted, it's more than likely impossible to recover!

### `/api/v1/saveData`
#### GET `/api/v1/saveData`

Type: `application/json`
Example request headers: `Authorization: Bearer {JWT}`

Request requirements:

- Authorization header must be set with a valid token

Possible responses:
`200`: Save data for user specified by token
`500`: Database error

Client design considerations:
Include a modified date with the save data to resolve cloud conflicts and avoid overwriting progress.

#### POST `/api/v1/saveData`

Type: `application/json`
Example request headers: `Authorization: Bearer {JWT}`
Example request body: `{"saveData": {"Johngrades": {"John Lennon": {"Owned": true, "Equipped": false}}}}`

Request requirements:

- Authorization header must be set with a valid token
- saveData must be set with any valid JSON object

Possible responses:
`200`: Save successful
`500`: Database error

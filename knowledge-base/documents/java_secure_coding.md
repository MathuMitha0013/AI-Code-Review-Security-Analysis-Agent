# Java Secure Coding Guidelines

## 1. Use PreparedStatement, never string-concatenated SQL

```java
// VULNERABLE
String query = "SELECT * FROM users WHERE username = '" + username + "'";
Statement stmt = connection.createStatement();
ResultSet rs = stmt.executeQuery(query);

// SECURE
String query = "SELECT * FROM users WHERE username = ?";
PreparedStatement stmt = connection.prepareStatement(query);
stmt.setString(1, username);
ResultSet rs = stmt.executeQuery();
```

## 2. Avoid deserializing untrusted data

Java's native `ObjectInputStream.readObject()` on untrusted data is a
well-known source of remote code execution vulnerabilities (deserialization
gadget chains).

```java
// VULNERABLE
ObjectInputStream ois = new ObjectInputStream(untrustedInputStream);
Object obj = ois.readObject();

// SECURE — prefer safe data formats (JSON via Jackson/Gson) for untrusted
// input, or use a look-ahead deserialization filter if native
// serialization is unavoidable.
```

## 3. Never hardcode credentials

```java
// VULNERABLE
private static final String DB_PASSWORD = "admin123";

// SECURE — load from environment or a secrets manager
private static final String DB_PASSWORD = System.getenv("DB_PASSWORD");
```

## 4. Use secure random number generation

```java
// VULNERABLE
Random random = new Random();
int token = random.nextInt();

// SECURE
SecureRandom secureRandom = new SecureRandom();
byte[] token = new byte[32];
secureRandom.nextBytes(token);
```

## 5. Validate and encode output to prevent XSS

When rendering user-supplied data in web output, always encode it for the
correct context (HTML, JavaScript, URL).

```java
// VULNERABLE (in a JSP/servlet response)
out.println("<div>" + userInput + "</div>");

// SECURE — use an established encoding library (e.g., OWASP Java Encoder)
out.println("<div>" + Encode.forHtml(userInput) + "</div>");
```

## 6. Disable XML External Entity (XXE) processing

XML parsers that resolve external entities can be exploited to read local
files or perform SSRF.

```java
// SECURE — disable external entity resolution
DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
dbf.setXIncludeAware(false);
dbf.setExpandEntityReferences(false);
```

## 7. Use try-with-resources to avoid resource leaks

Unclosed database connections, file streams, or sockets can lead to
resource exhaustion, which is a denial-of-service risk under load.

```java
// SECURE
try (Connection conn = dataSource.getConnection();
     PreparedStatement stmt = conn.prepareStatement(query)) {
    // use conn/stmt
} // automatically closed, even if an exception occurs
```

## 8. Principle of least privilege for access modifiers

Default class members and methods to the most restrictive visibility
(`private`) and only widen access (`protected`, `public`) when there is a
clear, deliberate reason — minimizing the attack surface of your classes.

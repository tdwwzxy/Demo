# 对接 Spring Boot

## 前端期望的接口契约

| 方法   | 路径              | 请求体    | 成功响应                                 |
| ------ | ----------------- | --------- | ---------------------------------------- |
| GET    | `/api/users`      | 无        | `{ "data": User[], "message": "ok" }`    |
| POST   | `/api/users`      | UserInput | `{ "data": User, "message": "created" }` |
| PUT    | `/api/users/{id}` | UserInput | `{ "data": User, "message": "updated" }` |
| DELETE | `/api/users/{id}` | 无        | `{ "data": null, "message": "deleted" }` |

```json
{
  "id": 1,
  "name": "李明",
  "email": "liming@example.com",
  "role": "DEVELOPER",
  "enabled": true
}
```

UserInput 不包含 id。role 必须为 ADMIN、DEVELOPER 或 VIEWER。错误使用非 2xx 状态，本项目显示状态码；删除成功约定为 200 + JSON，而非 204。

## 示例 Controller

以下代码用于已有的 Spring Boot 3/4 Web 项目（Java 17+），需要 Web MVC 和 Validation 依赖。将包名改为你的应用扫描范围。它不是本前端工程内启动的服务，也不会自动修改 Demo 项目。

这是教学用内存实现：重启丢失数据，不包含登录鉴权。真实项目应拆出 Service/Repository，使用数据库唯一约束、事务和权限校验。

```java
package com.example.frontendlab;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
    public enum Role { ADMIN, DEVELOPER, VIEWER }
    public record User(long id, String name, String email, Role role, boolean enabled) {}
    public record UserInput(
        @NotBlank @Size(min = 2, max = 30) String name,
        @NotBlank @Email String email,
        @NotNull Role role,
        @NotNull Boolean enabled
    ) {}
    public record ApiResponse<T>(T data, String message) {}

    private final Map<Long, User> users = new LinkedHashMap<>();
    private long nextId = 1;

    @GetMapping
    public synchronized ApiResponse<List<User>> list() {
        return new ApiResponse<>(List.copyOf(users.values()), "ok");
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public synchronized ApiResponse<User> create(@Valid @RequestBody UserInput input) {
        checkEmail(input.email(), -1);
        long id = nextId++;
        User user = toUser(id, input);
        users.put(id, user);
        return new ApiResponse<>(user, "created");
    }

    @PutMapping("/{id}")
    public synchronized ApiResponse<User> update(
            @PathVariable("id") long id, @Valid @RequestBody UserInput input) {
        requireUser(id);
        checkEmail(input.email(), id);
        User user = toUser(id, input);
        users.put(id, user);
        return new ApiResponse<>(user, "updated");
    }

    @DeleteMapping("/{id}")
    public synchronized ApiResponse<Void> delete(@PathVariable("id") long id) {
        requireUser(id);
        users.remove(id);
        return new ApiResponse<>(null, "deleted");
    }

    private User toUser(long id, UserInput input) {
        return new User(id, input.name().strip(), input.email().strip(), input.role(), input.enabled());
    }
    private void requireUser(long id) {
        if (!users.containsKey(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "用户不存在");
    }
    private void checkEmail(String email, long excludedId) {
        boolean duplicate = users.values().stream()
            .anyMatch(user -> user.id() != excludedId && user.email().equalsIgnoreCase(email.strip()));
        if (duplicate) throw new ResponseStatusException(HttpStatus.CONFLICT, "邮箱已存在");
    }
}
```

在 8080 端口启动后端，用 PowerShell 验证：

```powershell
Invoke-RestMethod http://localhost:8080/api/users
```

如果已有后端使用 `{ code, data, msg }` 或分页对象，修改 `src/services/http.ts` 的响应解析和 `src/services/users.ts` 的 list 映射，使前后端契约一致。

## 切换前端配置

```powershell
Copy-Item .env.example .env.local
```

编辑 `.env.local`：

```dotenv
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api
API_PROXY_TARGET=http://localhost:8080
```

重启 `pnpm dev`。请求路径：

```text
浏览器 GET http://127.0.0.1:5173/api/users
    → Vite 开发代理
    → Spring Boot http://localhost:8080/api/users
```

代理保留 `/api` 前缀，没有 rewrite。后端是 8081 时修改 API_PROXY_TARGET。不要将代理错误当作前端 React 错误。

## 生产部署

`pnpm build` 生成 `dist/`。Vite 的 server.proxy 不包含在这个静态目录中。

可由 Nginx 同域托管静态文件并将 `/api/` 转发后端，或将静态文件放入 Spring Boot 的 static 目录。若直接配置不同域名的 API，必须由后端配置恰当的 CORS。会话 Cookie、CSRF、JWT 等应按实际认证方案设计；本项目不冒充完整的生产鉴权模板。

构建时决定 VITE_ 环境变量：不要以为部署后改 `.env.local` 就会改变已经构建好的 JS 文件。

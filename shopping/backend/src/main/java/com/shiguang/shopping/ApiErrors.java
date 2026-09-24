package com.shiguang.shopping;

import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",e.getReason()==null?"操作失败":e.getReason())); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException e) {
        String field=e.getBindingResult().getFieldErrors().isEmpty()?"表单":e.getBindingResult().getFieldErrors().getFirst().getField();
        return ResponseEntity.badRequest().body(Map.of("message","请检查字段格式与范围："+field));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> conflict() { return ResponseEntity.status(409).body(Map.of("message","款号重复或数据与当前记录冲突，请检查后重试")); }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<?> json() { return ResponseEntity.badRequest().body(Map.of("message","请求格式不正确，请检查数字和必填项")); }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<?> size() { return ResponseEntity.status(413).body(Map.of("message","上传文件过大，图片最多 5 MB")); }
}

<template>
  <div class="import-permit-container">
    <div class="import-permit-form">
      <h1>PixLink</h1>
      <h2>导入ZTM Permit</h2>
      
      <div v-if="isLoading" class="loading-message">
        <div class="spinner"></div>
        <p>正在导入Permit...</p>
      </div>
      
      <div v-else-if="error" class="error-message">
        <p>{{ error }}</p>
        <button class="btn-primary" @click="goToDashboard">返回Dashboard</button>
      </div>
      
      <div v-else-if="success" class="success-message">
        <p>{{ success }}</p>
        <button class="btn-primary" @click="goToDashboard">前往Dashboard</button>
      </div>
      
      <div v-else class="form-content">
        <div class="info-box">
          <p><strong>说明：</strong></p>
          <p>请从您的邮箱中复制收到的完整ZTM Permit文件内容，然后粘贴到下方文本框中。</p>
          <p><strong>注意：</strong>Permit文件包含CA证书、Agent证书和Bootstrap节点信息。</p>
          <p>完整的Permit文件将用于验证您的设备身份并连接到PixLink网络。</p>
          <p v-if="props.certificateId" class="resend-hint">
            没有收到邮件？<button class="resend-link" @click="handleResendPermit">重新发送Permit邮件</button>
          </p>
        </div>
        
        <div class="form-group">
          <label for="permit-content">ZTM Permit 内容（完整JSON）</label>
          <textarea
            id="permit-content"
            v-model="permitContent"
            placeholder="请粘贴从邮箱中复制的完整ZTM Permit内容..."
            rows="12"
            @input="validatePermit"
          ></textarea>
          <div v-if="permitError" class="error-text">{{ permitError }}</div>
        </div>
        
        <button 
          class="btn-primary" 
          @click="importPermit"
          :disabled="isButtonDisabled"
        >
          导入Permit
        </button>
        
        <button class="btn-secondary" @click="resetForm" v-if="permitContent || error">
          清除内容
        </button>
        
        <button class="btn-secondary" @click="goToDashboard" v-else>
          返回Dashboard
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { store } from '../store';
import { ztmService } from '../services/ztmService';

const props = defineProps<{
  certificateId?: string;
}>();

const emit = defineEmits<{
  (e: 'import-success'): void;
  (e: 'resend-permit'): void;
}>();

const permitContent = ref('');
const permitError = ref('');
const isLoading = ref(false);
const error = ref('');
const success = ref('');

// Watch permitError changes
watch(permitError, (newVal, oldVal) => {
  console.log('permitError changed:', { oldVal, newVal, stack: new Error().stack });
});

// Watch permitContent changes
watch(permitContent, (newVal, oldVal) => {
  console.log('permitContent changed:', { oldVal, newVal, stack: new Error().stack });
});

const isButtonDisabled = computed(() => {
  const hasContent = !!permitContent.value.trim();
  const hasError = !!permitError.value;
  const result = !hasContent || hasError;
  
  console.log('isButtonDisabled calculation:', {
    permitContent: permitContent.value,
    hasContent: hasContent,
    permitError: permitError.value,
    hasError: hasError,
    result: result,
    resultType: typeof result,
    finalResult: Boolean(result)
  });
  
  return Boolean(result);
});

const validatePermit = () => {
  console.log('=== validatePermit called ===');
  permitError.value = '';
  console.log('After clearing permitError.value:', permitError.value);
  
  console.log('permitContent.value:', permitContent.value);
  console.log('permitContent.value.trim():', permitContent.value.trim());
  console.log('permitContent.value.length:', permitContent.value.length);
  
  if (!permitContent.value.trim()) {
    console.log('Setting error: Permit内容不能为空');
    permitError.value = 'Permit内容不能为空';
    return false;
  }
  
  try {
    const permit = JSON.parse(permitContent.value);
    
    console.log('Parsed permit:', permit);
    
    // Validate complete permit format (CA + Agent + Bootstraps)
    if (!permit.ca || typeof permit.ca !== 'string') {
      console.log('Setting error: Missing CA field');
      permitError.value = '无效的Permit格式：缺少ca字段';
      return false;
    }
    
    if (!permit.agent || !permit.agent.certificate) {
      console.log('Setting error: Missing agent certificate field');
      permitError.value = '无效的Permit格式：缺少agent.certificate字段';
      return false;
    }
    
    if (!permit.agent.name) {
      console.log('Setting error: Missing agent name field');
      permitError.value = '无效的Permit格式：缺少agent.name字段';
      return false;
    }
    
    if (!permit.bootstraps || !Array.isArray(permit.bootstraps) || permit.bootstraps.length === 0) {
      console.log('Setting error: Missing bootstraps field');
      permitError.value = '无效的Permit格式：缺少bootstraps字段';
      return false;
    }
    
    console.log('Permit validation passed');
    console.log('permitError.value after validation:', permitError.value);
    return true;
  } catch (e) {
    console.error('JSON parse error:', e);
    console.log('Setting error: Invalid JSON');
    permitError.value = '无效的Permit格式：必须是有效的JSON';
    return false;
  }
};

const importPermit = async () => {
  if (!validatePermit()) {
    return;
  }
  
  isLoading.value = true;
  error.value = '';
  success.value = '';
  
  try {
    const permit = JSON.parse(permitContent.value);
    
    console.log('Importing permit:', permit);
    
    const result = await ztmService.importPermit(permit);
    
    success.value = 'Permit导入成功！您的设备已连接到PixLink网络。';
    
    setTimeout(() => {
      goToDashboard();
    }, 2000);
  } catch (err: any) {
    error.value = err.message || 'Permit导入失败，请检查Permit内容是否正确。';
  } finally {
    isLoading.value = false;
  }
};

const resetForm = () => {
  permitContent.value = '';
  permitError.value = '';
  error.value = '';
  success.value = '';
};

const handleResendPermit = () => {
  emit('resend-permit');
};

const goToDashboard = () => {
  emit('import-success');
};
</script>

<style scoped>
.import-permit-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.import-permit-form {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 100%;
}

h1 {
  color: #667eea;
  font-size: 32px;
  margin-bottom: 10px;
  text-align: center;
}

h2 {
  color: #333;
  font-size: 24px;
  margin-bottom: 30px;
  text-align: center;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-box {
  background: #f8f9fa;
  border-left: 4px solid #667eea;
  padding: 15px;
  border-radius: 4px;
}

.info-box p {
  margin: 5px 0;
  color: #555;
}

.resend-hint {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.resend-link {
  background: none;
  border: none;
  color: #667eea;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  margin: 0;
  font-size: inherit;
}

.resend-link:hover {
  color: #5568d3;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  resize: vertical;
  box-sizing: border-box;
}

textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.error-text {
  color: #dc3545;
  font-size: 12px;
  margin-top: 5px;
}

.btn-primary {
  background: #667eea;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary:hover {
  background: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
}

.loading-message,
.error-message,
.success-message {
  text-align: center;
  padding: 20px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message p {
  color: #dc3545;
  margin-bottom: 20px;
}

.success-message p {
  color: #28a745;
  margin-bottom: 20px;
  font-weight: 600;
}
</style>
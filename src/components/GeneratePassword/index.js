import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Button,
  Input,
  Switch,
  Slider,
  Tooltip,
  Card,
  Space,
  message,
  Flex,
} from "antd";
import {
  CopyOutlined,
  CheckOutlined,
  SyncOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useTheme } from "../../theme";
import strong from "../../assets/images/security.png";
import weak from "../../assets/images/unprotected.png";

export default function GeneratePassword() {
  const { isDarkMode } = useTheme();

  // State management
  const [passwordState, setPasswordState] = useState({
    password: "bU59Hf8NfiGmYoa",
    length: 15,
    strength: "Strong password",
  });

  const [uiState, setUiState] = useState({
    copied: false,
    insert: false,
  });

  const initialCheckboxList = useMemo(
    () => [
      {
        name: "Uppercase",
        value: "ABC",
        default: true,
        character: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      },
      {
        name: "Lowercase",
        value: "abc",
        default: true,
        character: "abcdefghijklmnopqrstuvwxyz",
      },
      {
        name: "Digits",
        value: "123",
        default: true,
        character: "0123456789",
      },
      {
        name: "Symbols",
        value: "#$&",
        default: false,
        character: "!@#$%^&*()_+-=[]{}|;:,.<>?",
      },
    ],
    [],
  );

  const [checkBoxList, setCheckBoxList] = useState(initialCheckboxList);

  // Memoized character set
  const availableChars = useMemo(() => {
    return checkBoxList
      .filter((item) => item.default)
      .map((item) => item.character)
      .join("");
  }, [checkBoxList]);

  // Renk için CSS filter hesaplama
  const getSvgFilter = useCallback((color) => {
    // Hex color to filter conversion (basit versiyon)
    const colorMap = {
      "#52c41a":
        "invert(47%) sepia(98%) saturate(368%) hue-rotate(72deg) brightness(95%) contrast(89%)",
      "#faad14":
        "invert(67%) sepia(90%) saturate(400%) hue-rotate(360deg) brightness(100%) contrast(95%)",
      "#ff4d4f":
        "invert(33%) sepia(98%) saturate(1352%) hue-rotate(325deg) brightness(101%) contrast(101%)",
      "#1890ff":
        "invert(44%) sepia(98%) saturate(1735%) hue-rotate(185deg) brightness(98%) contrast(101%)",
    };

    return colorMap[color] || colorMap["#52c41a"];
  }, []);

  // Password strength evaluation
  const evaluatePassword = useCallback(
    (password) => {
      if (!password) {
        setPasswordState((prev) => ({ ...prev, strength: "" }));
        return;
      }

      // Kullanılan karakter setinin büyüklüğünü tahmin et
      let poolSize = 0;
      if (/[a-z]/.test(password)) poolSize += 26;
      if (/[A-Z]/.test(password)) poolSize += 26;
      if (/\d/.test(password)) poolSize += 10;
      if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) poolSize += 32;

      // Entropi (bit cinsinden)
      const entropy = password.length * Math.log2(poolSize || 1);

      // Tekrar/pattern cezası (basit): benzersiz karakter oranı düşükse entropiyi kır
      const uniqueRatio = new Set(password).size / password.length;
      const adjustedEntropy = entropy * uniqueRatio;

      let text, color, icon;
      if (adjustedEntropy < 28) {
        [text, color, icon] = ["Very Weak", "#ff4d4f", weak];
      } else if (adjustedEntropy < 36) {
        [text, color, icon] = ["Weak", "#ff4d4f", weak];
      } else if (adjustedEntropy < 60) {
        [text, color, icon] = ["Fair", "#faad14", weak];
      } else if (adjustedEntropy < 80) {
        [text, color, icon] = ["Good", "#52c41a", strong];
      } else if (adjustedEntropy < 100) {
        [text, color, icon] = ["Strong", "#52c41a", strong];
      } else {
        [text, color, icon] = ["Very Strong", "#1890ff", strong];
      }

      setPasswordState((prev) => ({
        ...prev,
        strength: text,
        strengthColor: color,
        strengthIcon: icon,
        strengthFilter: getSvgFilter(color),
      }));
    },
    [getSvgFilter],
  );

  // Kriptografik olarak güvenli rastgele index üretir (modulo bias yok)
  const getSecureRandomIndex = (max) => {
    const array = new Uint32Array(1);
    const limit = Math.floor(0xffffffff / max) * max;
    let randomValue;
    do {
      window.crypto.getRandomValues(array);
      randomValue = array[0];
    } while (randomValue >= limit);
    return randomValue % max;
  };

  // Fisher-Yates shuffle (güvenli rastgelelik ile)
  const secureShuffle = (arr) => {
    const array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
      const j = getSecureRandomIndex(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const generatePassword = useCallback(
    (newLength) => {
      const currentLength = newLength ?? passwordState.length;

      const activeGroups = checkBoxList.filter((item) => item.default);

      if (activeGroups.length === 0) {
        message.warning("Please select at least one character type");
        return;
      }

      if (currentLength < activeGroups.length) {
        message.warning(
          `Password length must be at least ${activeGroups.length} to include all selected character types`,
        );
        return;
      }

      const passwordChars = [];

      // Seçili her kategoriden en az 1 karakter garanti et
      activeGroups.forEach((group) => {
        const randomIndex = getSecureRandomIndex(group.character.length);
        passwordChars.push(group.character[randomIndex]);
      });

      // Kalan uzunluğu tüm karakter setinden doldur
      const combinedChars = activeGroups.map((g) => g.character).join("");
      for (let i = passwordChars.length; i < currentLength; i++) {
        const randomIndex = getSecureRandomIndex(combinedChars.length);
        passwordChars.push(combinedChars[randomIndex]);
      }

      // Karakterlerin sırasını karıştır (garanti edilen karakterler hep başta olmasın diye)
      const newPassword = secureShuffle(passwordChars).join("");

      evaluatePassword(newPassword);
      setPasswordState((prev) => ({
        ...prev,
        password: newPassword,
        length: currentLength,
      }));
    },
    [passwordState.length, checkBoxList, evaluatePassword],
  );

  // Initial password generation
  useEffect(() => {
    generatePassword();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Copy to clipboard
  const copyClipboard = useCallback(async () => {
    if (!passwordState.password) {
      message.warning("No password to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(passwordState.password);
      setUiState((prev) => ({ ...prev, copied: true }));
      setTimeout(
        () => setUiState((prev) => ({ ...prev, copied: false })),
        2000,
      );
      message.success("Password copied to clipboard!");
    } catch (error) {
      console.error("Copy failed:", error);
      message.error("Failed to copy password");
    }
  }, [passwordState.password]);

  // Handle checkbox changes
  const handleCheckboxChange = useCallback((value, checked) => {
    setCheckBoxList((prevState) => {
      const updatedList = prevState.map((item) =>
        item.value === value ? { ...item, default: checked } : item,
      );

      const activeSelections = updatedList.filter(
        (item) => item.default,
      ).length;

      if (activeSelections === 0) {
        message.warning("At least one character type must be selected");
        return prevState;
      }

      return updatedList;
    });
  }, []);

  // Handle slider changes
  const handleSliderChange = useCallback(
    (newValue) => {
      setPasswordState((prev) => ({ ...prev, length: newValue }));
      generatePassword(newValue);
    },
    [generatePassword],
  );

  // Insert password functionality
  const insertPassword = useCallback(() => {
    if (!passwordState.password) {
      message.warning("No password to insert");
      return;
    }

    setUiState((prev) => ({ ...prev, insert: true }));
    setTimeout(() => setUiState((prev) => ({ ...prev, insert: false })), 2000);

    /* eslint-disable no-undef */
    try {
      chrome.runtime.sendMessage({
        type: "SET_PASSWORD",
        password: passwordState.password,
      });
      message.success("Password inserted!");
    } catch (error) {
      console.error("Insert failed:", error);
      message.error("Failed to insert password");
    }
    /* eslint-enable no-undef */
  }, [passwordState.password]);

  const cardStyle = {
    padding: 0,
    border: 0,
    borderRadius: 0,
    background: isDarkMode ? "#141414" : "#fff",
  };

  const textStyle = {
    color: isDarkMode ? "#ffffff" : "#000000",
  };

  return (
    <Card style={cardStyle}>
      <Space.Compact>
        <Input
          style={{
            flex: 1,
            fontSize: "16px",
            fontWeight: "500",
            height: "48px",
            background: isDarkMode ? "#1f1f1f" : "#fff",
            color: textStyle.color,
            borderColor: isDarkMode ? "#434343" : "#d9d9d9",
          }}
          value={passwordState.password}
          readOnly
          placeholder="Click generate to create password"
          size="large"
          suffix={
            <Flex gap="small" wrap>
              <Tooltip title={uiState.copied ? "Copied!" : "Copy to clipboard"}>
                <Button
                  size="small"
                  icon={uiState.copied ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={copyClipboard}
                  type="link"
                />
              </Tooltip>
              <Tooltip title="Insert password">
                <Button
                  size="small"
                  icon={
                    uiState.insert ? <CheckOutlined /> : <ArrowRightOutlined />
                  }
                  onClick={insertPassword}
                  type="link"
                />
              </Tooltip>
            </Flex>
          }
        />
        <Button
          type="primary"
          size="large"
          icon={<SyncOutlined />}
          onClick={() => generatePassword()}
          style={{ height: 48 }}
        />
      </Space.Compact>
      <Flex
        justify="center"
        align="center"
        gap="small"
        style={{ margin: "10px 0" }}
      >
        <img
          src={passwordState.strengthIcon}
          style={{
            width: "18px",
            height: "18px",
            filter: passwordState.strengthFilter,
          }}
          alt={passwordState.strength}
        />
        <span
          style={{
            fontSize: "18px",
            fontWeight: "500",
            color: passwordState.strengthColor,
          }}
        >
          {passwordState.strength}
        </span>
      </Flex>
      <Flex
        justify="center"
        style={{
          ...textStyle,
          fontSize: "14px",
          fontWeight: "500",
          marginBottom: 10,
        }}
      >
        Password Length: {passwordState.length}
      </Flex>
      <Flex justify="center">
        <Slider
          value={passwordState.length}
          onChange={handleSliderChange}
          min={4}
          max={32}
          style={{
            width: "calc(100% - 60px)",
          }}
          tooltip={{ formatter: (value) => `${value} characters` }}
        />
      </Flex>
      <Space direction="vertical" style={{ width: "100%", marginBottom: 20 }}>
        {checkBoxList.map((item) => (
          <div
            key={item.value}
            className="character-option"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "5px 0",
              opacity: item.disabled ? 0.5 : 1,
            }}
          >
            <span style={{ ...textStyle, fontSize: "14px", fontWeight: "500" }}>
              {item.name} ({item.value})
            </span>
            <Switch
              checked={item.default}
              disabled={item.disabled}
              onChange={(checked) => handleCheckboxChange(item.value, checked)}
              size="small"
            />
          </div>
        ))}
      </Space>
      <Button
        type="primary"
        size="large"
        onClick={() => generatePassword()}
        style={{ width: "100%", height: 48 }}
      >
        Generate
      </Button>
    </Card>
  );
}

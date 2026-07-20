import {
    Autocomplete,
    type AutocompleteChangeReason,
    type AutocompleteCloseReason,
    type AutocompleteProps,
    Chip,
    createFilterOptions,
    TextField,
    type TextFieldProps,
    useForkRef,
} from '@mui/material';
import {
    styled,
    useThemeProps,
    type Theme,
} from '@mui/material/styles';
import clsx from 'clsx';
import debounce from 'lodash/debounce.js';
import get from 'lodash/get.js';
import isEqual from 'lodash/isEqual.js';
import {
    type ChoicesProps,
    FieldTitle,
    type RaRecord,
    type SupportCreateSuggestionOptions,
    useChoicesContext,
    useEvent,
    useGetRecordRepresentation,
    useInput,
    useSuggestions,
    type UseSuggestionsOptions,
    useSupportCreateSuggestion,
    useTimeout,
    useTranslate,
    warning,
} from 'ra-core';
import * as React from 'react';
import {
    isValidElement,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Offline } from '../Offline';
import type { CommonInputProps } from './CommonInputProps';
import { InputHelperText } from './InputHelperText';
import { sanitizeInputRestProps } from './sanitizeInputRestProps';

const defaultFilterOptions = createFilterOptions();

export const AutocompleteInput = <
    OptionType extends RaRecord = RaRecord,
    Multiple extends boolean | undefined = false,
    DisableClearable extends boolean | undefined = boolean | undefined,
    SupportCreate extends boolean | undefined = false,
>(
    inProps: AutocompleteInputProps<
        OptionType,
        Multiple,
        DisableClearable,
        SupportCreate
    >
) => {
    const props = useThemeProps({
        props: inProps,
        name: PREFIX,
    });
    const {
        choices: choicesProp,
        className,
        clearOnBlur = true,
        clearText = 'ra.action.clear_input_value',
        closeText = 'ra.action.close',
        create,
        createLabel,
        createItemLabel = 'ra.action.create_item',
        createValue,
        createHintValue,
        debounce: debounceDelay = 250,
        defaultValue,
        emptyText,
        emptyValue = '',
        field: fieldOverride,
        format,
        helperText,
        id: idOverride,
        inputText,
        isFetching: isFetchingProp,
        isLoading: isLoadingProp,
        isPending: isPendingProp,
        isRequired: isRequiredOverride,
        label,
        limitChoicesToValue,
        loadingText = 'ra.message.loading',
        matchSuggestion,
        margin,
        fieldState: fieldStateOverride,
        filterToQuery: filterToQueryProp = DefaultFilterToQuery,
        formState: formStateOverride,
        multiple = false,
        noOptionsText,
        offline = defaultOffline,
        onBlur,
        onChange,
        onClose: onCloseProp,
        onCreate,
        onOpen: onOpenProp,
        openText = 'ra.action.open',
        optionText,
        optionValue,
        parse,
        resource: resourceProp,
        shouldRenderSuggestions,
        setFilter,
        size,
        source: sourceProp,
        suggestionLimit = Infinity,
        TextFieldProps,
        translateChoice,
        validate,
        variant,
        onInputChange,
        disabled,
        readOnly,
        getOptionDisabled: getOptionDisabledProp,
        ...rest
    } = props;

    const filterToQuery = useEvent(filterToQueryProp);

    const {
        allChoices,
        isPaused,
        isPending,
        isPlaceholderData,
        error: fetchError,
        resource,
        source,
        setFilters,
        isFromReference,
    } = useChoicesContext({
        choices: choicesProp,
        isFetching: isFetchingProp,
        isLoading: isLoadingProp,
        isPending: isPendingProp,
        resource: resourceProp,
        source: sourceProp,
    });

    const translate = useTranslate();

    const {
        id,
        field,
        isRequired,
        fieldState: { error, invalid },
    } = useInput({
        defaultValue,
        id: idOverride,
        field: fieldOverride,
        fieldState: fieldStateOverride,
        formState: formStateOverride,
        isRequired: isRequiredOverride,
        onBlur,
        onChange,
        parse,
        format,
        resource,
        source,
        validate,
        disabled,
        readOnly,
        ...rest,
    });

    const finalChoices = useMemo(
        () =>
            emptyText == undefined || isRequired || multiple
                ? allChoices
                : [
                      {
                          [optionValue || 'id']: emptyValue,
                          [typeof optionText === 'string'
                              ? optionText
                              : 'name']: translate(emptyText, {
                              _: emptyText,
                          }),
                      } as OptionType,
                  ].concat((allChoices as OptionType[]) || []),
        [
            allChoices,
            emptyValue,
            emptyText,
            isRequired,
            multiple,
            optionText,
            optionValue,
            translate,
        ]
    );

    const selectedChoice = useSelectedChoice<
        OptionType,
        Multiple,
        DisableClearable,
        SupportCreate
    >(field.value, {
        choices: finalChoices as OptionType[],
        multiple,
        optionValue,
    });

    useEffect(() => {
        if (emptyValue == null) {
            throw new Error(
                `emptyValue being set to null or undefined is not supported. Use parse to turn the empty string into null.`
            );
        }
    }, [emptyValue]);

    useEffect(() => {
        if (isValidElement(optionText) && emptyText != undefined) {
            throw new Error(
                `optionText of type React element is not supported when setting emptyText`
            );
        }
        if (isValidElement(optionText) && inputText == undefined) {
            throw new Error(`
If you provided a React element for the optionText prop, you must also provide the inputText prop (used for the text input)`);
        }
        if (
            isValidElement(optionText) &&
            !isFromReference &&
            matchSuggestion == undefined
        ) {
            throw new Error(`
If you provided a React element for the optionText prop, you must also provide the matchSuggestion prop (used to match the user input with a choice)`);
        }
    }, [optionText, inputText, matchSuggestion, emptyText, isFromReference]);

    useEffect(() => {
        warning(
            shouldRenderSuggestions != undefined && noOptionsText == undefined,
            `When providing a shouldRenderSuggestions function, we recommend you also provide the noOptionsText prop and set it to a text explaining users why no options are displayed. It supports translation keys.`
        );
    }, [shouldRenderSuggestions, noOptionsText]);

    const getRecordRepresentation = useGetRecordRepresentation(resource);

    const { getChoiceText, getChoiceValue, getSuggestions } = useSuggestions({
        choices: finalChoices,
        limitChoicesToValue,
        matchSuggestion,
        optionText:
            optionText ??
            (isFromReference ? getRecordRepresentation : undefined),
        optionValue,
        createValue,
        createHintValue,
        selectedItem: selectedChoice,
        suggestionLimit,
        translateChoice: translateChoice ?? !isFromReference,
    });

    const [filterValue, setFilterValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const canRenderSuggestions =
        shouldRenderSuggestions == undefined ||
        shouldRenderSuggestions(filterValue);

    const handleOpen = useEvent((event: React.SyntheticEvent) => {
        setIsOpen(true);
        onOpenProp?.(event);
    });

    const handleClose = useEvent(
        (event: React.SyntheticEvent, reason: AutocompleteCloseReason) => {
            setIsOpen(false);
            onCloseProp?.(event, reason);
        }
    );

    const handleChange = useEvent((newValue: OptionType | OptionType[] | null) => {
        if (multiple) {
            if (Array.isArray(newValue)) {
                field.onChange(newValue.map(getChoiceValue), newValue);
            } else {
                field.onChange(
                    [...(field.value ?? []), getChoiceValue(newValue)],
                    newValue
                );
            }
        } else {
            field.onChange(getChoiceValue(newValue) ?? emptyValue, newValue);
        }
    });

    const debouncedSetFilter = useCallback(
        debounce((filter: string) => {
            if (setFilter) {
                return setFilter(filter);
            }

            if (choicesProp) {
                return;
            }

            setFilters(filterToQuery(filter));
        }, debounceDelay),
        [debounceDelay, setFilters, setFilter, filterToQuery, choicesProp]
    );

    const currentValue = useRef(field.value);
    useEffect(() => {
        if (!isEqual(currentValue.current, field.value)) {
            currentValue.current = field.value;
            debouncedSetFilter('');
        }
    }, [field.value, debouncedSetFilter]);

    const {
        getCreateItem,
        handleChange: handleChangeWithCreateSupport,
        createElement,
        createId,
        createHintId,
        getOptionDisabled: getOptionDisabledWithCreateSupport,
    } = useSupportCreateSuggestion({
        create,
        createLabel,
        createItemLabel,
        createValue,
        createHintValue,
        handleChange,
        filter: filterValue,
        onCreate,
        optionText,
    });

    const getOptionDisabled = useCallback(
        (option: OptionType) => {
            return (
                getOptionDisabledWithCreateSupport(option) ||
                (getOptionDisabledProp && getOptionDisabledProp(option))
            );
        },
        [getOptionDisabledProp, getOptionDisabledWithCreateSupport]
    );

    const getOptionLabel = useCallback(
        (option: OptionType | string | null | undefined, isListItem: boolean = false): string | ReactNode => {
            if (option == undefined) {
                return '';
            }

            if (typeof option === 'string') {
                return option;
            }

            if (option.id === createId || option.id === createHintId) {
                return get(
                    option,
                    typeof optionText === 'string' ? optionText : 'name'
                ) as ReactNode;
            }

            if (!isListItem && option[optionValue || 'id'] === emptyValue) {
                return get(
                    option,
                    typeof optionText === 'string' ? optionText : 'name'
                ) as ReactNode;
            }

            if (!isListItem && inputText !== undefined) {
                return inputText(option);
            }

            return getChoiceText(option);
        },
        [
            getChoiceText,
            inputText,
            createId,
            createHintId,
            optionText,
            optionValue,
            emptyValue,
        ]
    );

    const getOptionLabelString = useCallback(
        (option: OptionType | string, isListItem: boolean = false): string => {
            const optionLabel = getOptionLabel(option, isListItem);
            return typeof optionLabel === 'string' ? optionLabel : '';
        },
        [getOptionLabel]
    );

    const finalOnBlur = useCallback(
        (event: React.FocusEvent<HTMLInputElement>): void => {
            if (clearOnBlur && !multiple) {
                const optionLabel = getOptionLabel(selectedChoice as OptionType);
                if (!isEqual(optionLabel, filterValue)) {
                    setFilterValue(typeof optionLabel === 'string' ? optionLabel : '');
                    debouncedSetFilter('');
                }
            }
            field.onBlur(event);
        },
        [
            clearOnBlur,
            field,
            getOptionLabel,
            selectedChoice,
            filterValue,
            debouncedSetFilter,
            multiple,
        ]
    );

    useEffect(() => {
        if (!multiple) {
            const optionLabel = getOptionLabel(selectedChoice as OptionType);
            if (typeof optionLabel === 'string') {
                setFilterValue(optionLabel);
            } else if (optionLabel !== undefined && optionLabel !== null) {
                throw new Error(
                    'When optionText returns a React element, you must also provide the inputText prop'
                );
            }
        }
    }, [getOptionLabel, multiple, selectedChoice]);

    const doesQueryMatchSelection = useCallback(
        (filter: string) => {
            let selectedItemTexts;

            if (multiple) {
                selectedItemTexts = (selectedChoice as OptionType[]).map(item =>
                    getOptionLabelString(item)
                );
            } else {
                selectedItemTexts = [getOptionLabelString(selectedChoice as OptionType)];
            }

            return selectedItemTexts.includes(filter);
        },
        [getOptionLabelString, multiple, selectedChoice]
    );

    const handleInputChange: AutocompleteProps<
        OptionType,
        Multiple,
        DisableClearable,
        SupportCreate
    >['onInputChange'] = useEvent((event, newInputValue, reason) => {
        if (
            event?.type === 'change' ||
            !doesQueryMatchSelection(newInputValue)
        ) {
            const createOptionLabel =
                typeof createItemLabel === 'string'
                    ? translate(createItemLabel, {
                          item: filterValue,
                          _: createItemLabel,
                      })
                    : undefined;
            const isCreate = newInputValue === createOptionLabel;
            const valueToSet = isCreate ? filterValue : newInputValue;
            setFilterValue(valueToSet);
            debouncedSetFilter(newInputValue);
        }
        if (reason === 'clear') {
            setFilterValue('');
            debouncedSetFilter('');
        }
        if (
            reason === 'reset' &&
            event !== null &&
            doesQueryMatchSelection(newInputValue)
        ) {
            setFilterValue(newInputValue);
            debouncedSetFilter('');
        }
        onInputChange?.(event, newInputValue, reason);
    });

    const doesQueryMatchSuggestion = useCallback(
        (filter: string) => {
            const hasOption = finalChoices
                ? (finalChoices as OptionType[]).some(choice => getOptionLabelString(choice) === filter)
                : false;

            return doesQueryMatchSelection(filter) || hasOption;
        },
        [finalChoices, getOptionLabelString, doesQueryMatchSelection]
    );

    const filterOptions = (options: OptionType[], params: any) => {
        let filteredOptions =
            isFromReference || 
            matchSuggestion || 
            limitChoicesToValue 
                ? options
                : defaultFilterOptions(options, params);

        const { inputValue } = params;
        if (onCreate || create) {
            if (inputValue === '' && filterValue === '' && createLabel) {
                filteredOptions = filteredOptions.concat(getCreateItem('') as OptionType);
            } else if (
                inputValue &&
                filterValue &&
                !doesQueryMatchSuggestion(filterValue)
            ) {
                filteredOptions = filteredOptions.concat(
                    getCreateItem(inputValue) as OptionType
                );
            }
        }

        return filteredOptions;
    };

    const handleAutocompleteChange = useCallback(
        (event: React.SyntheticEvent, newValue: OptionType | OptionType[] | null, reason: AutocompleteChangeReason) => {
            event.preventDefault();
            if (reason === 'createOption') {
                const valueToCreate = Array.isArray(newValue)
                    ? newValue[newValue.length - 1]
                    : newValue;
                handleChangeWithCreateSupport(
                    getCreateItem(typeof valueToCreate === 'string' ? valueToCreate : undefined)
                );
                return;
            }
            handleChangeWithCreateSupport(
                newValue != null ? newValue : emptyValue
            );
        },
        [emptyValue, getCreateItem, handleChangeWithCreateSupport]
    );

    const oneSecondHasPassed = useTimeout(1000, filterValue);

    const suggestions = useMemo(() => {
        if (!isFromReference && (matchSuggestion || limitChoicesToValue)) {
            return getSuggestions(filterValue) as OptionType[];
        }
        return (finalChoices as OptionType[])?.slice(0, suggestionLimit) || [];
    }, [
        finalChoices,
        filterValue,
        getSuggestions,
        limitChoicesToValue,
        matchSuggestion,
        suggestionLimit,
        isFromReference,
    ]);

    const isOptionEqualToValue = (option: OptionType, value: OptionType) => {
        return String(getChoiceValue(option)) === String(getChoiceValue(value));
    };
    const renderHelperText = !!fetchError || helperText !== false || invalid;

    const handleInputRef = useForkRef(field.ref, TextFieldProps?.inputRef);

    if (isPending && isPaused && offline !== false && offline !== undefined) {
        return offline;
    }

    const renderChips = (
        value: OptionType[],
        getCustomProps: (args: { index: number }) => Record<string, unknown>
    ) =>
        value.map((option, index) => {
            const { key, ...chipProps } = getCustomProps({ index }) as any;
            return (
                <Chip
                    key={key ?? index}
                    label={getOptionLabel(option, true)}
                    size="small"
                    {...chipProps}
                />
            );
        });

    return (
        <>
            <StyledAutocomplete
                blurOnSelect={!multiple}
                clearOnBlur={clearOnBlur}
                className={clsx('ra-input', `ra-input-${source}`, className)}
                clearText={translate(clearText, { _: clearText })}
                closeText={translate(closeText, { _: closeText })}
                disabled={disabled || readOnly}
                disableCloseOnSelect={multiple}
                filterOptions={filterOptions}
                getOptionLabel={getOptionLabelString}
                getOptionDisabled={getOptionDisabled}
                id={id}
                isOptionEqualToValue={isOptionEqualToValue}
                loading={
                    (isPendingProp && !isFetchingProp) ||
                    (isPendingProp &&
                        isFetchingProp &&
                        !isPlaceholderData &&
                        oneSecondHasPassed)
                }
                loadingText={translate(loadingText, { _: loadingText })}
                multiple={multiple as Multiple}
                noOptionsText={
                    noOptionsText === undefined ? (
                        translate('ra.navigation.no_results')
                    ) : (
                        <span>
                            {translate(noOptionsText, { _: noOptionsText })}
                        </span>
                    )
                }
                onBlur={finalOnBlur}
                onChange={handleAutocompleteChange as AutocompleteProps<OptionType, Multiple, DisableClearable, SupportCreate>['onChange']}
                onClose={handleClose}
                onInputChange={handleInputChange}
                onOpen={handleOpen}
                open={isOpen && canRenderSuggestions}
                openText={translate(openText, { _: openText })}
                options={suggestions}
                renderInput={params => {
                    // Extract ref from MUI Autocomplete params.inputProps
                    const { ref: autocompleteInputRef, ...paramsInputProps } = params.inputProps;
                    
                    // Fork all refs together so both React Hook Form and MUI Autocomplete get the HTMLInputElement
                    const combinedInputRef = useForkRef(
                        handleInputRef,
                        autocompleteInputRef
                    );

                    return (
                        <TextField
                            {...params}
                            {...TextFieldProps}
                            name={field.name}
                            label={
                                label !== '' &&
                                label !== false && (
                                    <FieldTitle
                                        label={label}
                                        source={source}
                                        resource={resource}
                                        isRequired={isRequired}
                                    />
                                )
                            }
                            error={invalid}
                            margin={margin}
                            variant={variant}
                            InputProps={{
                                ...params.InputProps,
                                ...TextFieldProps?.InputProps,
                            }}
                            inputProps={{
                                ...paramsInputProps,
                                ...TextFieldProps?.inputProps,
                            }}
                            inputRef={combinedInputRef}
                        />
                    );
                }}
                renderOption={(optionProps, record: OptionType) => {
                    const { key: ignoredKey, ...restOptionProps } = optionProps as any;
                    const key = getChoiceValue(record);
                    const optionLabel = getOptionLabel(record, true);
                    const isCreateOption =
                        record.id === createId || record.id === createHintId;
                    return (
                        <li
                            key={key}
                            {...restOptionProps}
                            className={clsx(
                                restOptionProps.className,
                                isCreateOption &&
                                    AutocompleteInputClasses.createOption
                            )}
                        >
                            {optionLabel === '' ? ' ' : optionLabel}
                        </li>
                    );
                }}
                renderTags={renderChips}
                value={selectedChoice as any}
                {...sanitizeInputRestProps(rest)}
            />
            {createElement}
            {renderHelperText ? (
                <InputHelperText
                    error={
                        invalid
                            ? (fetchError?.message ?? error?.message)
                            : undefined
                    }
                    helperText={helperText}
                />
            ) : null}
        </>
    );
};

export type AutocompleteInputProps<
    OptionType extends RaRecord = RaRecord,
    Multiple extends boolean | undefined = false,
    DisableClearable extends boolean | undefined = false,
    SupportCreate extends boolean | undefined = false,
> = Omit<CommonInputProps, 'source' | 'onChange' | 'defaultValue'> &
    Omit<ChoicesProps, 'disableValue'> &
    UseSuggestionsOptions &
    Omit<SupportCreateSuggestionOptions, 'handleChange' | 'optionText'> &
    Omit<
        AutocompleteProps<
            OptionType,
            Multiple,
            DisableClearable,
            SupportCreate
        >,
        'onChange' | 'options' | 'renderInput' | 'defaultValue' | 'multiple'
    > & {
        defaultValue?: Multiple extends true ? OptionType[] : OptionType;
        debounce?: number;
        emptyText?: string;
        emptyValue?: any;
        filterToQuery?: (searchText: string) => any;
        inputText?: (option: OptionType) => string;
        onChange?: (value: any) => void;
        setFilter?: (value: string) => void;
        shouldRenderSuggestions?: (filter: string) => boolean;
        TextFieldProps?: TextFieldProps;
        multiple?: Multiple;
    };

const DefaultFilterToQuery = (searchText: string) => ({ q: searchText });
const defaultOffline = <Offline />;

const PREFIX = 'RaAutocompleteInput';
export const AutocompleteInputClasses = {
    createOption: `${PREFIX}-createOption`,
};

const StyledAutocomplete = styled(Autocomplete, {
    name: PREFIX,
    overridesResolver: (props, styles) => styles.root,
})(({ theme }: { theme: Theme }) => ({
    [`& .${AutocompleteInputClasses.createOption}`]: {
        fontStyle: 'italic',
    },
})) as typeof Autocomplete;

function areSelectedItemsEqual(
    selectedItem: any,
    newSelectedItem: any,
    optionValue: string
) {
    const selectedChoiceArray = Array.isArray(selectedItem)
        ? selectedItem
        : [selectedItem];

    const newSelectedChoiceArray = Array.isArray(newSelectedItem)
        ? newSelectedItem
        : [newSelectedItem];

    if (selectedChoiceArray.length !== newSelectedChoiceArray.length) {
        return false;
    }
    const equalityArray = selectedChoiceArray.map((choice: RaRecord) =>
        newSelectedChoiceArray.some(
            (newChoice: RaRecord) =>
                get(newChoice, optionValue) === get(choice, optionValue)
        )
    );
    return equalityArray.every(val => val);
}

const useSelectedChoice = <
    OptionType extends RaRecord = RaRecord,
    Multiple extends boolean | undefined = false,
    DisableClearable extends boolean | undefined = false,
    SupportCreate extends boolean | undefined = false,
>(
    value: unknown,
    {
        choices,
        multiple,
        optionValue,
    }: AutocompleteInputProps<
        OptionType,
        Multiple,
        DisableClearable,
        SupportCreate
    >
): OptionType | OptionType[] | null => {
    const [selectedChoice, setSelectedChoice] = useState<OptionType | OptionType[] | null>(
        multiple ? [] : null
    );

    useEffect(() => {
        if (!choices) {
            return;
        }
        let newSelectedItem: OptionType | OptionType[] | null;
        if (multiple) {
            newSelectedItem = (Array.isArray(value) ? value : [])
                .map(val =>
                    choices.find(
                        choice =>
                            get(choice, optionValue as string) === val
                    )
                )
                .filter(val => val !== undefined) as OptionType[];
        } else {
            newSelectedItem =
                choices.find(
                    choice =>
                        get(choice, optionValue as string) === value
                ) || null;
        }
        if (
            !areSelectedItemsEqual(
                selectedChoice,
                newSelectedItem,
                optionValue as string
            )
        ) {
            setSelectedChoice(newSelectedItem);
        }
    }, [value, choices, optionValue, multiple, selectedChoice]);

    return selectedChoice;
};

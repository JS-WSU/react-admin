import * as React from 'react';
import {
    cloneElement,
    isValidElement,
    type ReactElement,
    useCallback,
    useMemo,
    useState,
    createContext,
    useContext,
} from 'react';
import { useTranslate } from '../../i18n';
import type { RaRecord } from '../../types';

export interface UseSupportCreateValue {
    getCreateItem: (filterValue?: string) => any;
    handleChange: (itemOrEvent: any) => void;
    createElement: ReactElement | null;
    createId: string;
    createHintId: string;
    getOptionDisabled: (option: unknown) => boolean;
    getCreateHintItem: () => any;
}

export interface SupportCreateSuggestionOptions {
    create?: ReactElement | boolean;
    createLabel?: string;
    createItemLabel?: string | ((filter: string) => React.ReactNode);
    createValue?: string;
    createHintValue?: string;
    handleChange: (item: any) => void;
    filter?: string;
    onCreate?: (filter: string) => void;
    optionText?: any;
}

export interface CreateSuggestionContextValue {
    filter?: string;
    onCancel: () => void;
    onCreate: (item: any) => void;
}

export const CreateSuggestionContext = createContext<
    CreateSuggestionContextValue | undefined
>(undefined);

export const useCreateSuggestionContext = () => {
    const context = useContext(CreateSuggestionContext);
    if (!context) {
        throw new Error(
            'useCreateSuggestionContext must be used within a CreateSuggestionContext.Provider'
        );
    }
    return context;
};

/**
 * This hook provides support for suggestion creation in inputs which have suggestions.
 *
 * @param {SupportCreateSuggestionOptions} options
 * @param {ReactElement | boolean} options.create A react element which will be rendered when users leave the input with a non-empty value.
 * @param {string} options.createLabel The label for the create option which is added to the suggestions when users typed a value that doesn't match an existing suggestion.
 * @param {string | Function} options.createItemLabel The label for the actual item created. It is used as the label for the create option which is added to the suggestions when users typed a value that doesn't match an existing suggestion.
 * @param {string} options.createValue The value for the create option which is added to the suggestions when users typed a value that doesn't match an existing suggestion.
 * @param {string} options.createHintValue The value for the create hint option which is added to the suggestions when the create limit is not reached.
 * @param {Function} options.handleChange A function to call when users selected a suggestion.
 * @param {string} options.filter The current filter value.
 * @param {Function} options.onCreate A function to call when users submit the creation form.
 * @param {string} options.optionText The property to use to get the display value of a suggestion.
 */
export const useSupportCreateSuggestion = (
    options: SupportCreateSuggestionOptions
): UseSupportCreateValue => {
    const {
        create,
        createLabel = 'ra.action.create',
        createItemLabel = 'ra.action.create_item',
        createValue = '@@ra-create',
        createHintValue = '@@ra-create-hint',
        handleChange,
        filter = '',
        onCreate,
        optionText = 'name',
    } = options;
    const translate = useTranslate();
    const [renderDialog, setRenderDialog] = useState(false);
    const [dialogFilter, setDialogFilter] = useState<string>('');

    const getCreateItem = useCallback(
        (filterValue: string = '') => {
            const createOptionLabel =
                typeof createItemLabel === 'string'
                    ? translate(createItemLabel, {
                          item: filterValue,
                          _: createItemLabel,
                      })
                    : createItemLabel(filterValue);
            return {
                id: createValue,
                [typeof optionText === 'string' ? optionText : 'name']:
                    createOptionLabel,
            };
        },
        [createItemLabel, translate, createValue, optionText]
    );

    const getCreateHintItem = useCallback(() => {
        return {
            id: createHintValue,
            [typeof optionText === 'string' ? optionText : 'name']:
                translate(createLabel),
        };
    }, [createHintValue, createLabel, translate, optionText]);

    const context = useMemo(
        () => ({
            filter: dialogFilter,
            onCancel: () => {
                setRenderDialog(false);
                setDialogFilter('');
            },
            onCreate: (item: RaRecord) => {
                setRenderDialog(false);
                setDialogFilter('');
                handleChange(item);
            },
        }),
        [dialogFilter, handleChange]
    );

    return {
        getCreateItem,
        handleChange: useCallback(
            (itemOrEvent: any) => {
                const item =
                    itemOrEvent?.target?.value === undefined
                        ? itemOrEvent
                        : itemOrEvent.target.value;

                if (
                    item?.id === createValue ||
                    item === createValue ||
                    item?.id === createHintValue ||
                    item === createHintValue
                ) {
                    if (typeof onCreate === 'function') {
                        onCreate(filter || '');
                        return;
                    }
                    if (isValidElement(create)) {
                        setDialogFilter(filter || '');
                        setRenderDialog(true);
                        return;
                    }
                }
                handleChange(itemOrEvent);
            },
            [
                create,
                createValue,
                createHintValue,
                filter,
                handleChange,
                onCreate,
            ]
        ),
        createElement:
            renderDialog && isValidElement(create) ? (
                <CreateSuggestionContext.Provider value={context}>
                    {cloneElement(create, context as any)}
                </CreateSuggestionContext.Provider>
            ) : null,
        createId: createValue,
        createHintId: createHintValue,
        getOptionDisabled: (option: unknown): boolean => {
            const optionCast = option as { id?: unknown };
            return Boolean(
                (optionCast &&
                    typeof optionCast === 'object' &&
                    'id' in optionCast &&
                    optionCast.id === createHintValue) ||
                    option === createHintValue
            );
        },
        getCreateHintItem,
    };
};
